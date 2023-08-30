// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface ITOKEN {
    function FEES() external view returns (address);
}

interface IOTOKEN {
    function mint(address account, uint amount) external returns (bool);
}

interface IGridRewarder {
    function notifyRewardAmount(address token, uint amount) external;
}

/**
 * @title Minter
 * @author heesho
 * 
 * Mints OTOKEN and distributes them to the Voter (to diribute to gauges), the team
 * and the growth fund (VTOKEN stakers).
 * 
 * Mints OTOKEN every week starting with {weekly} OTOKENs per week and decreases by 1% every week
 * until it reaches tail emissions, which is a constant emission rate of OTOKENS per week.
 * 
 * Tail emissions are 0.1% emissions of the total TOKEN supply per week.
 */
contract Minter {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint internal constant WEEK = 86400 * 7;            // allows minting once per week (reset every Thursday 00:00 UTC)
    uint internal constant EMISSION = 990;              // 99% of minted tokens go to the pool
    uint internal constant PRECISION = 1000;            // precision for math
    uint public constant TAIL_RATE = 100 * 1e18;    // Min of 100 OTOKEN per week tail emission

    /*----------  STATE VARIABLES  --------------------------------------*/

    IERC20 public immutable OTOKEN;     // the token distruted to gauges as rewards
    ITOKEN public immutable TOKEN;    // TOKEN
    IGridRewarder public immutable gridRewarder;     // Grid Rewarder

    uint public weekly = 1000 * 1e18;    // represents a starting weekly emission of 1000 OTOKEN (OTOKEN has 18 decimals)
    uint public active_period;           // the current period (week) that is active

    address internal initializer;   // the address that can initialize the contract (owner)
    uint public growthRate = 200;   // the rate of emissions that go to growth (bps)

    /*----------  ERRORS ------------------------------------------------*/

    error Minter__InvalidZeroAddress();
    error Minter__UnathorizedInitializer();

    /*----------  EVENTS ------------------------------------------------*/

    event Minter__Mint(address indexed sender, uint weekly);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroAddress(address _account) {
        if (_account == address(0)) revert Minter__InvalidZeroAddress();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice Constructs the Minter contract.
     * @param _OTOKEN OTOKEN contract address
     * @param _TOKEN token rewarder contract address
     * @param _gridRewarder grid rewarder contract address
     */
    constructor(
        address _OTOKEN, 
        address _TOKEN,
        address _gridRewarder
    ) {
        initializer = msg.sender;
        TOKEN = ITOKEN(_TOKEN);
        gridRewarder = IGridRewarder(_gridRewarder);
        OTOKEN = IERC20(_OTOKEN);
        active_period = ((block.timestamp + (2 * WEEK)) / WEEK) * WEEK;
    }

    /**
     * @notice Updates the period and mints new tokens if necessary. Can only be called once per epoch (1 week).
     */
    function update_period() external returns (uint) {
        uint _period = active_period;
        if (block.timestamp >= _period + WEEK && initializer == address(0)) { // only trigger if new week
            _period = (block.timestamp / WEEK) * WEEK;
            active_period = _period;
            weekly = weekly_emission();

            uint _growth = calculate_growth(weekly);
            uint _required = _growth + weekly;
            uint _balanceOf = OTOKEN.balanceOf(address(this));
            if (_balanceOf < _required) {
                require(IOTOKEN(address(OTOKEN)).mint(address(this), _required - _balanceOf));
            }

            OTOKEN.safeTransfer(TOKEN.FEES(), _growth);

            OTOKEN.approve(address(gridRewarder), weekly);
            gridRewarder.notifyRewardAmount(address(OTOKEN), weekly);

            emit Minter__Mint(msg.sender, weekly);
        }
        return _period;
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function initialize() 
        external 
    {
        if (msg.sender != initializer) revert Minter__UnathorizedInitializer();
        initializer = address(0);
        active_period = ((block.timestamp) / WEEK) * WEEK; // allow minter.update_period() to mint new emissions THIS Thursday
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    // emission calculation is 1% of available supply to mint adjusted by circulating / total supply
    function calculate_emission() public view returns (uint) {
        return (weekly * EMISSION) / PRECISION;
    }

    // weekly emission takes the max of calculated (aka target) emission versus circulating tail end emission
    function weekly_emission() public view returns (uint) {
        return Math.max(calculate_emission(), TAIL_RATE);
    }

    // calculate inflation and adjust ve balances accordingly
    function calculate_growth(uint _minted) public view returns (uint) {
        return (_minted * growthRate) / PRECISION;
    }

}