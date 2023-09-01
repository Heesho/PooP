// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IOTOKEN {
    function burnFrom(address account, uint256 amount) external;
}

interface IGridRewarder {
    function _deposit(uint amount, address account) external;
    function _withdraw(uint amount, address account) external;
    function addReward(address rewardToken) external;
}

interface IGridRewarderFactory {
    function createGridRewarder(address _grid) external returns (address rewarder);
}

contract Grid is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant AMOUNT = 1e18;
    uint256 public constant DURATION = 7 days;
    uint256 public constant X_MAX = 50;
    uint256 public constant Y_MAX = 50;
    uint256 public constant COLOR_MAX = 4;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable OTOKEN;
    address public immutable gridRewarder;

    struct Tile {
        uint256 color;
        address account;
    }

    Tile[X_MAX][Y_MAX] public grid;
    mapping(address => uint256) public placed;

    /*----------  ERRORS ------------------------------------------------*/

    error Grid__InvalidZeroInput();
    error Grid__NonMatchingLengths();
    error Grid__InvalidColor();
    error Grid__InvalidCoordinates();

    /*----------  EVENTS ------------------------------------------------*/

    event Grid__Placed(address indexed placer,address indexed account, address indexed prevAccount, uint256 x, uint256 y, uint256 color);

    /*----------  MODIFIERS  --------------------------------------------*/

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _OTOKEN, address _gridRewarderFactory) {
        OTOKEN = _OTOKEN;
        gridRewarder = IGridRewarderFactory(_gridRewarderFactory).createGridRewarder(address(this));
        IGridRewarder(gridRewarder).addReward(_OTOKEN);
    }

    function placeFor(address account, uint256[] memory x, uint256[] memory y, uint256 color) 
        external 
        nonReentrant 
    {
        if (color > COLOR_MAX) revert Grid__InvalidColor();
        uint256 length = x.length;
        if (length == 0) revert Grid__InvalidZeroInput();
        if (length != y.length) revert Grid__NonMatchingLengths();
        for (uint256 i = 0; i < length; i++) {
            if (x[i] > X_MAX || y[i] > Y_MAX) revert Grid__InvalidCoordinates();
            address prevAccount = grid[x[i]][y[i]].account;
            grid[x[i]][y[i]].color = color;
            grid[x[i]][y[i]].account = account;
            if (prevAccount != address(0)) {
                IGridRewarder(gridRewarder)._withdraw(AMOUNT, prevAccount);
            }
            emit Grid__Placed(msg.sender, account, prevAccount, x[i], y[i], color);
        }
        placed[account] += (length * AMOUNT);
        IOTOKEN(OTOKEN).burnFrom(msg.sender, length * AMOUNT);
        IGridRewarder(gridRewarder)._deposit(length * AMOUNT, account);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getRow(uint256 y) external view returns (Tile[X_MAX] memory) {
        Tile[X_MAX] memory row;
        for (uint256 i = 0; i < X_MAX; i++) {
            row[i] = grid[i][y];
        }
        return row;
    }

    function getCol(uint256 x) external view returns (Tile[Y_MAX] memory) {
        Tile[Y_MAX] memory column;
        for (uint256 i = 0; i < Y_MAX; i++) {
            column[i] = grid[x][i];
        }
        return column;
    }

    function getGrid() external view returns (Tile[X_MAX][Y_MAX] memory) {
        return grid;
    }

    function getTile(uint256 x, uint256 y) external view returns (Tile memory) {
        return grid[x][y];
    }

    function readXAxis(uint xcursor, uint ycursor, uint length) public view returns (Tile[] memory) {
        Tile[] memory array = new Tile[](length);
        for (uint i = xcursor; i < xcursor + length; i++) {
            array[i] = grid[i][ycursor];
        }
        return array;
    }

    function readYAxis(uint xcursor, uint ycursor, uint length) public view returns (Tile[] memory) {
        Tile[] memory array = new Tile[](length);
        for (uint i = ycursor; i < ycursor + length; i++) {
            array[i] = grid[xcursor][i];
        }
        return array;
    }

}