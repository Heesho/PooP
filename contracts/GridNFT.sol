// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
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

contract GridNFT is ERC721, ERC721Enumerable, ERC721URIStorage, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant AMOUNT = 1e18;
    uint256 public constant X_MAX = 10;
    uint256 public constant Y_MAX = 10;
    uint256 public constant FEE = 100;
    uint256 public constant DIVISOR = 1000;
    uint256 public constant MAX_SUPPLY = 100;

    /*----------  STATE VARIABLES  --------------------------------------*/
    
    address public immutable OTOKEN;
    address public immutable gridRewarder;

    Counters.Counter private _tokenIdCounter;

    struct Tile {
        uint256 color;
        address account;
    }

    string[] public colors;
    uint256 public totalPlaced;
    mapping(address => uint256) public placed;
    mapping(uint256 => Tile[X_MAX][Y_MAX]) public grids;

    /*----------  ERRORS ------------------------------------------------*/

    error GridNFT__InvalidZeroInput();
    error GridNFT__NonMatchingLengths();
    error GridNFT__InvalidCoordinates();
    error GridNFT__MaxSupplyReached();
    error GridNFT__InvalidColor();
    error GridNFT__TokenIdDoesNotExist();

    /*----------  EVENTS ------------------------------------------------*/

    event GridNFT__Placed(address indexed placer,address indexed account, address indexed prevAccount, uint256 tokenId, uint256 x, uint256 y, uint256 color);

    /*----------  MODIFIERS  --------------------------------------------*/

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _OTOKEN, address _gridRewarderFactory) 
        ERC721("GridNFT", "GRID") 
    {
        OTOKEN = _OTOKEN;
        gridRewarder = IGridRewarderFactory(_gridRewarderFactory).createGridRewarder(address(this));
        IGridRewarder(gridRewarder).addReward(_OTOKEN);
    }

    function placeFor(uint256 tokenId, address account, uint256[] memory x, uint256[] memory y, uint256 color) 
        external 
        nonReentrant 
    {
        if (!_exists(tokenId)) revert GridNFT__TokenIdDoesNotExist();
        if (color >= colors.length) revert GridNFT__InvalidColor();
        uint256 length = x.length;
        if (length == 0) revert GridNFT__InvalidZeroInput();
        if (length != y.length) revert GridNFT__NonMatchingLengths();
        for (uint256 i = 0; i < length; i++) {
            if (x[i] > X_MAX || y[i] > Y_MAX) revert GridNFT__InvalidCoordinates();
            address prevAccount = grids[tokenId][x[i]][y[i]].account;
            grids[tokenId][x[i]][y[i]].color = color;
            grids[tokenId][x[i]][y[i]].account = account;
            if (prevAccount != address(0)) {
                IGridRewarder(gridRewarder)._withdraw(AMOUNT, prevAccount);
            }
            emit GridNFT__Placed(msg.sender, account, prevAccount, tokenId, x[i], y[i], color);
        }
        uint256 amount = length * AMOUNT;
        totalPlaced += amount;
        placed[account] += (amount);
        uint256 fee = amount * FEE / DIVISOR;
        IERC20(OTOKEN).transferFrom(msg.sender, ownerOf(tokenId), fee);
        IOTOKEN(OTOKEN).burnFrom(msg.sender, amount - fee);
        IGridRewarder(gridRewarder)._deposit(amount, account);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function safeMint(address to) external onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        if (tokenId >= MAX_SUPPLY) revert GridNFT__MaxSupplyReached();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    function setColors(string[] memory _colors) external onlyOwner {
        colors = _colors;
    }

    function concatenateParts(string[100] memory parts) internal pure returns (string memory) {
        string memory svgPart = parts[0];
        for (uint i = 1; i < 100; i++) {
            svgPart = string(abi.encodePacked(svgPart, parts[i]));
        }
        return svgPart;
    }

    function generateSVG(uint256 tokenId) internal view returns (string memory) {
        require(_exists(tokenId), "GridNFT: Grid does not exist");
        string[100] memory parts;
        uint counter = 0;
        
        string memory svgPart1 = '<svg width="350" height="350" xmlns="http://www.w3.org/2000/svg"><style>rect {stroke-width:0; shape-rendering: crispEdges;}</style><rect width="350" height="350" fill="black" /><g>';

        for (uint i = 0; i < 10; i++) {
            for (uint j = 0; j < 10; j++) {
                parts[counter] = string(abi.encodePacked(
                    '<rect x="',
                    Strings.toString(j * 35),   
                    '" y="',
                    Strings.toString(i * 35),  
                    '" width="35" height="35" fill="', 
                    colors[grids[tokenId][i][j].color],
                    '" />'
                ));
                counter++;
            }
        }
        
        string memory svgPart2 = concatenateParts(parts);
        string memory svgPart3 = '</g></svg>';

        return string(abi.encodePacked(svgPart1, svgPart2, svgPart3));
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getGrid(uint256 tokenId) external view returns (Tile[X_MAX][Y_MAX] memory) {
        require(_exists(tokenId), "GridNFT: Grid does not exist");
        return grids[tokenId];
    }

    function getTile(uint256 tokenId, uint256 x, uint256 y) external view returns (Tile memory) {
        return grids[tokenId][x][y];
    }

    function getColor(uint256 index) external view returns (string memory color) {
        return colors[index];
    }

    function getColors() external view returns (string[] memory) {
        return colors;
    }

    /*----------  OVERRIDES  --------------------------------------------*/

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return generateSVG(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

}