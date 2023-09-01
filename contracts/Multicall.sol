// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface ITOKEN {
    function totalSupply() external view returns (uint256);
    function frBASE() external view returns (uint256);
    function mrvBASE() external view returns (uint256);
    function mrrBASE() external view returns (uint256);
    function mrrTOKEN() external view returns (uint256);
    function getFloorPrice() external view returns (uint256);
    function getMaxSell() external view returns (uint256);
    function getMarketPrice() external view returns (uint256);
    function getOTokenPrice() external view returns (uint256);
    function getTotalValueLocked() external view returns (uint256);
    function getAccountCredit(address account) external view returns (uint256) ;
    function debts(address account) external view returns (uint256);
    function fees() external view returns (address);
}

interface ITOKENRewarder {
    function balanceOf(address account) external view returns (uint256);
    function balanceOfTOKEN(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function totalSupplyTOKEN() external view returns (uint256);
    function rewardPerToken(address _rewardsToken) external view returns (uint256);
    function getRewardForDuration(address reward) external view returns (uint);
    function earned(address account, address _rewardsToken) external view returns (uint256);
}

interface IGrid {
    struct Tile {
        uint256 color;
        address account;
    }
    function placed(address account) external view returns (uint256);
    function getGrid() external view returns (Tile[50][50] memory);
    function getRow(uint256 y) external view returns (Tile[50] memory);
    function getCol(uint256 x) external view returns (Tile[50] memory);
    function getTile(uint256 x, uint256 y) external view returns (Tile memory);
    function readXAxis(uint256 xCursor, uint256 yCursor, uint256 length) external view returns (Tile[] memory tiles);
    function readYAxis(uint256 xCursor, uint256 yCursor, uint256 length) external view returns (Tile[] memory tiles);
}

interface IGridRewarder {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function rewardPerToken(address _rewardsToken) external view returns (uint256);
    function getRewardForDuration(address reward) external view returns (uint);
    function earned(address account, address _rewardsToken) external view returns (uint256);
}

interface IMinter {
    function weekly() external view returns (uint256);
}

interface IEACAggregatorProxy {
    function latestAnswer() external view returns (uint256);
}

contract Multicall {

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant FEE = 30;
    uint256 public constant DIVISOR = 10000;
    uint256 public constant PRECISION = 1e18;
    address public constant ORACLE = 0x0715A7794a1dc8e42615F059dD6e406A6594651A;
    uint256 public constant X_MAX = 50;
    uint256 public constant Y_MAX = 50;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable BASE;
    address public immutable TOKEN;
    address public immutable OTOKEN;
    address public immutable tokenRewarder;
    address public immutable grid;
    address public immutable gridRewarder;
    address public immutable minter;

    struct Coord {
        uint256 x;
        uint256 y;
    }

    struct SwapCard {
        uint256 frBASE;
        uint256 mrvBASE;
        uint256 mrrBASE;
        uint256 mrrTOKEN;
        uint256 marketMaxTOKEN;
    }

     struct BondingCurve {
        uint256 priceBASE;              // C1
        uint256 priceTOKEN;             // C2
        uint256 priceOTOKEN;            // C3
        uint256 maxMarketSell;          // C4

        uint256 tvl;                    // C5
        uint256 supplyTOKEN;            // C6
        uint256 supplyStaked;           // C7
        uint256 apr;                    // C8
        uint256 ltv;                    // C9
        uint256 marketCap;              // C10
        uint256 weeklyOTOKEN;           // C11

        uint256 accountBASE;            // C12
        uint256 accountTOKEN;           // C13
        uint256 accountOTOKEN;          // C14

        uint256 accountEarnedBASE;      // C15
        uint256 accountEarnedTOKEN;     // C16    
        uint256 accountEarnedOTOKEN;    // C17 

        uint256 accountStaked;          // C18
        uint256 accountPower;           // C19

        uint256 accountBorrowCredit;    // C20
        uint256 accountBorrowDebt;      // C21
        uint256 accountMaxWithdraw;     // C22

        uint256 accountTilesOwned;      // C23
        uint256 accountTilesPlaced;     // C24
    }

    struct Portfolio {
        uint256 total;
        uint256 stakingRewards;
        uint256 gridRewards;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _BASE,
        address _TOKEN,
        address _OTOKEN,
        address _tokenRewarder,
        address _grid,
        address _gridRewarder,
        address _minter
    ) {
        BASE = _BASE;
        TOKEN = _TOKEN;
        OTOKEN = _OTOKEN;
        tokenRewarder = _tokenRewarder;
        grid = _grid;
        gridRewarder = _gridRewarder;
        minter = _minter;
    }

    function swapCardData() external view returns (SwapCard memory swapCard) {
        swapCard.frBASE = ITOKEN(TOKEN).frBASE();
        swapCard.mrvBASE = ITOKEN(TOKEN).mrvBASE();
        swapCard.mrrBASE = ITOKEN(TOKEN).mrrBASE();
        swapCard.mrrTOKEN = ITOKEN(TOKEN).mrrTOKEN();
        swapCard.marketMaxTOKEN = ITOKEN(TOKEN).mrvBASE();

        return swapCard;
    }

    function bondingCurveData(address account) external view returns (BondingCurve memory bondingCurve) {
        // bondingCurve.priceBASE = IEACAggregatorProxy(ORACLE).latestAnswer() * 1e18 / 1e8;
        bondingCurve.priceBASE = 1e18;
        bondingCurve.priceTOKEN = ITOKEN(TOKEN).getMarketPrice() * bondingCurve.priceBASE / 1e18;
        bondingCurve.priceOTOKEN = ITOKEN(TOKEN).getOTokenPrice() * bondingCurve.priceBASE / 1e18;
        bondingCurve.maxMarketSell = ITOKEN(TOKEN).getMaxSell();

        bondingCurve.tvl = ITOKEN(TOKEN).getTotalValueLocked() * bondingCurve.priceBASE / 1e18;
        bondingCurve.supplyTOKEN = IERC20(TOKEN).totalSupply();
        bondingCurve.supplyStaked = ITOKENRewarder(tokenRewarder).totalSupplyTOKEN();
        bondingCurve.apr = bondingCurve.supplyStaked == 0 ? 0 : (((ITOKENRewarder(tokenRewarder).getRewardForDuration(BASE) * bondingCurve.priceBASE / 1e18) + 
            (ITOKENRewarder(tokenRewarder).getRewardForDuration(TOKEN) * bondingCurve.priceTOKEN / 1e18) + 
            (ITOKENRewarder(tokenRewarder).getRewardForDuration(OTOKEN) * bondingCurve.priceOTOKEN / 1e18)) 
            * 365 * 100 * 1e18 / (7 * ITOKENRewarder(tokenRewarder).totalSupply() * bondingCurve.priceTOKEN / 1e18));
        bondingCurve.ltv = 100 * ITOKEN(TOKEN).getFloorPrice() * 1e18 / ITOKEN(TOKEN).getMarketPrice();
        bondingCurve.marketCap = bondingCurve.supplyTOKEN * bondingCurve.priceTOKEN / 1e18;
        bondingCurve.weeklyOTOKEN = IMinter(minter).weekly();

        bondingCurve.accountBASE = (account == address(0) ? 0 : IERC20(BASE).balanceOf(account));
        bondingCurve.accountTOKEN = (account == address(0) ? 0 : IERC20(TOKEN).balanceOf(account));
        bondingCurve.accountOTOKEN = (account == address(0) ? 0 : IERC20(OTOKEN).balanceOf(account));

        bondingCurve.accountEarnedBASE = (account == address(0) ? 0 : ITOKENRewarder(tokenRewarder).earned(account, BASE));
        bondingCurve.accountEarnedTOKEN = (account == address(0) ? 0 : ITOKENRewarder(tokenRewarder).earned(account, TOKEN));
        bondingCurve.accountEarnedOTOKEN = (account == address(0) ? 0 : ITOKENRewarder(tokenRewarder).earned(account, OTOKEN));

        bondingCurve.accountStaked = (account == address(0) ? 0 : ITOKENRewarder(tokenRewarder).balanceOfTOKEN(account));
        bondingCurve.accountPower = (account == address(0) ? 0 : ITOKENRewarder(tokenRewarder).balanceOf(account));

        bondingCurve.accountBorrowCredit = (account == address(0) ? 0 : ITOKEN(TOKEN).getAccountCredit(account));
        bondingCurve.accountBorrowDebt = (account == address(0) ? 0 : ITOKEN(TOKEN).debts(account));
        bondingCurve.accountMaxWithdraw = (account == address(0) ? 0 : bondingCurve.accountStaked - (bondingCurve.accountBorrowDebt * DIVISOR));

        bondingCurve.accountTilesOwned = (account == address(0) ? 0 : IGridRewarder(gridRewarder).balanceOf(account));
        bondingCurve.accountTilesPlaced = (account == address(0) ? 0 : IGrid(grid).placed(account));

        return bondingCurve;
    }

    function portfolioData(address account) external view returns (Portfolio memory portfolio) {
        // uint256 priceBASE = IEACAggregatorProxy(ORACLE).latestAnswer() * 1e18 / 1e8;
        uint256 priceBASE = 1e18;

        portfolio.total = (account == address(0) ? 0 : priceBASE * ((IERC20(BASE).balanceOf(account)) 
            + ((IERC20(TOKEN).balanceOf(account) + ITOKENRewarder(tokenRewarder).balanceOfTOKEN(account)) * ITOKEN(TOKEN).getMarketPrice() / 1e18) 
            + (IERC20(OTOKEN).balanceOf(account) * ITOKEN(TOKEN).getOTokenPrice() / 1e18)) / 1e18);

        portfolio.stakingRewards = (account == address(0) ? 0 : priceBASE * (ITOKENRewarder(tokenRewarder).getRewardForDuration(BASE)
            + (ITOKENRewarder(tokenRewarder).getRewardForDuration(TOKEN) * ITOKEN(TOKEN).getMarketPrice() / 1e18)
            + (ITOKENRewarder(tokenRewarder).getRewardForDuration(OTOKEN) * ITOKEN(TOKEN).getOTokenPrice() / 1e18)) / 1e18
            * ITOKENRewarder(tokenRewarder).balanceOf(account) / ITOKENRewarder(tokenRewarder).totalSupply());

        portfolio.gridRewards = (account == address(0) ? 0  : IGridRewarder(gridRewarder).getRewardForDuration(OTOKEN) * 
            IGridRewarder(gridRewarder).balanceOf(account) / IGridRewarder(gridRewarder).totalSupply() * ITOKEN(TOKEN).getOTokenPrice() / 1e18 * priceBASE / 1e18);

        return portfolio;
    }

    function getRow(uint256 y) external view returns (IGrid.Tile[X_MAX] memory row) {
        return IGrid(grid).getRow(y);
    }

    function getCol(uint256 x) external view returns (IGrid.Tile[Y_MAX] memory col) {
        return IGrid(grid).getCol(x);
    }

    function getGrid() external view returns (IGrid.Tile[X_MAX][Y_MAX] memory) {
        return IGrid(grid).getGrid();
    }

    function quoteBuyIn(uint256 input, uint256 slippageTolerance) external view returns (uint256 output, uint256 slippage, uint256 minOutput, uint256 autoMinOutput) {
        uint256 feeBASE = input * FEE / DIVISOR;
        uint256 oldMrBASE = ITOKEN(TOKEN).mrvBASE() + ITOKEN(TOKEN).mrrBASE();
        uint256 newMrBASE = oldMrBASE + input - feeBASE;
        uint256 oldMrTOKEN = ITOKEN(TOKEN).mrrTOKEN();
        output = oldMrTOKEN - (oldMrBASE * oldMrTOKEN / newMrBASE);
        slippage = 100 * (1e18 - (output * ITOKEN(TOKEN).getMarketPrice() / input));
        minOutput = (input * 1e18 / ITOKEN(TOKEN).getMarketPrice()) * slippageTolerance / DIVISOR;
        autoMinOutput = (input * 1e18 / ITOKEN(TOKEN).getMarketPrice()) * ((DIVISOR * 1e18) - ((slippage + 1e18) * 100)) / (DIVISOR * 1e18);
    }

    function quoteBuyOut(uint256 input, uint256 slippageTolerance) external view returns (uint256 output, uint256 slippage, uint256 minOutput, uint256 autoMinOutput) {
        uint256 oldMrBASE = ITOKEN(TOKEN).mrvBASE() + ITOKEN(TOKEN).mrrBASE();
        output = DIVISOR * ((oldMrBASE * ITOKEN(TOKEN).mrrTOKEN() / (ITOKEN(TOKEN).mrrTOKEN() - input)) - oldMrBASE) / (DIVISOR - FEE);
        slippage = 100 * (1e18 - (input * ITOKEN(TOKEN).getMarketPrice() / output));
        minOutput = input * slippageTolerance / DIVISOR;
        autoMinOutput = input * ((DIVISOR * 1e18) - ((slippage + 1e18) * 100)) / (DIVISOR * 1e18);
    }

    function quoteSellIn(uint256 input, uint256 slippageTolerance) external view returns (uint256 output, uint256 slippage, uint256 minOutput, uint256 autoMinOutput) {
        uint256 feeTOKEN = input * FEE / DIVISOR;
        uint256 oldMrTOKEN = ITOKEN(TOKEN).mrrTOKEN();
        uint256 newMrTOKEN = oldMrTOKEN + input - feeTOKEN;
        if (newMrTOKEN > ITOKEN(TOKEN).mrvBASE()) {
            return (0, 0, 0, 0);
        }

        uint256 oldMrBASE = ITOKEN(TOKEN).mrvBASE() + ITOKEN(TOKEN).mrrBASE();
        output = oldMrBASE - (oldMrBASE * oldMrTOKEN / newMrTOKEN);
        slippage = 100 * (1e18 - (output * 1e18 / (input * ITOKEN(TOKEN).getMarketPrice() / 1e18)));
        minOutput = input * ITOKEN(TOKEN).getMarketPrice() /1e18 * slippageTolerance / DIVISOR;
        autoMinOutput = input * ITOKEN(TOKEN).getMarketPrice() /1e18 * ((DIVISOR * 1e18) - ((slippage + 1e18) * 100)) / (DIVISOR * 1e18);
    }

    function quoteSellOut(uint256 input, uint256 slippageTolerance) external view returns (uint256 output, uint256 slippage, uint256 minOutput, uint256 autoMinOutput) {
        uint256 oldMrBASE = ITOKEN(TOKEN).mrvBASE() + ITOKEN(TOKEN).mrrBASE();
        output = DIVISOR * ((oldMrBASE * ITOKEN(TOKEN).mrrTOKEN() / (oldMrBASE - input)) - ITOKEN(TOKEN).mrrTOKEN()) / (DIVISOR - FEE);
        if (output + ITOKEN(TOKEN).mrrTOKEN() > ITOKEN(TOKEN).mrvBASE()) {
            return (0, 0, 0, 0);
        }
        slippage = 100 * (1e18 - (input * 1e18 / (output * ITOKEN(TOKEN).getMarketPrice() / 1e18)));
        minOutput = input * slippageTolerance / DIVISOR;
        autoMinOutput = input * ((DIVISOR * 1e18) - ((slippage + 1e18) * 100)) / (DIVISOR * 1e18);
    }


}