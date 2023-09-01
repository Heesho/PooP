const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const one = convert("1", 18);
const two = convert("2", 18);
const five = convert("5", 18);
const ten = convert("10", 18);
const twenty = convert("20", 18);
const ninety = convert("90", 18);
const oneHundred = convert("100", 18);
const twoHundred = convert("200", 18);
const fiveHundred = convert("500", 18);
const eightHundred = convert("800", 18);
const oneThousand = convert("1000", 18);

let owner, multisig, treasury, user0, user1, user2, user3;
let TOKENRewarderFactory, OTOKENFactory, feesFactory, gridRewarderFactory;
let TOKEN, TOKENRewarder, OTOKEN, BASE, grid, gridRewarder, minter, fees, multicall;;

describe("test0", function () {
    before("Initial set up", async function () {
        console.log("Begin Initialization");
  
        // initialize users
        [owner, multisig, treasury, user0, user1, user2, user3] = await ethers.getSigners();
  
        // initialize ERC20Mocks
        const ERC20MockArtifact = await ethers.getContractFactory("ERC20Mock");
        BASE = await ERC20MockArtifact.deploy("BASE", "BASE");
        await BASE.mint(user1.address, oneHundred);
        await BASE.mint(user2.address, oneHundred);
        await BASE.mint(user3.address, oneHundred);
        console.log("- ERC20Mocks Initialized");

        // initialize OTOKENFactory
        const OTOKENFactoryArtifact = await ethers.getContractFactory("OTOKENFactory");
        OTOKENFactory = await OTOKENFactoryArtifact.deploy();
        console.log("- OTOKENFactory Initialized");

        // initialize TOKENRewarderFactory
        const TOKENRewarderFactoryArtifact = await ethers.getContractFactory("TOKENRewarderFactory");
        TOKENRewarderFactory = await TOKENRewarderFactoryArtifact.deploy();
        console.log("- TOKENRewarderFactory Initialized");

        // initialize FeesFactory
        const FeesFactoryArtifact = await ethers.getContractFactory("TOKENFeesFactory");
        feesFactory = await FeesFactoryArtifact.deploy();
        console.log("- FeesFactory Initialized");

        // initialize GridRewarderFactory
        const gridRewarderFactoryArtifact = await ethers.getContractFactory("GridRewarderFactory");
        gridRewarderFactory = await gridRewarderFactoryArtifact.deploy();
        console.log("- GridRewarderFactory Initialized");

        // intialize TOKEN
        const TOKENArtifact = await ethers.getContractFactory("TOKEN");
        TOKEN = await TOKENArtifact.deploy(BASE.address, OTOKENFactory.address, TOKENRewarderFactory.address, feesFactory.address);
        console.log("- TOKEN Initialized");

        // initialize TOKENFees
        fees = await ethers.getContractAt("contracts/TOKENFeesFactory.sol:TOKENFees", await TOKEN.fees());
        console.log("- TOKENFees Initialized");

        //initialize OTOKEN
        OTOKEN = await ethers.getContractAt("contracts/OTOKENFactory.sol:OTOKEN", await TOKEN.OTOKEN());
        console.log("- OTOKEN Initialized");

        //initialize TOKENRewarder
        TOKENRewarder = await ethers.getContractAt("contracts/TOKENRewarderFactory.sol:TOKENRewarder", await TOKEN.rewarder());
        console.log("- TOKENRewarder Initialized");

        // initialize Grid
        const GridArtifact = await ethers.getContractFactory("Grid");
        grid = await GridArtifact.deploy(OTOKEN.address, gridRewarderFactory.address);

        //initialize GridRewarder
        gridRewarder = await ethers.getContractAt("contracts/GridRewarderFactory.sol:GridRewarderFactory", await grid.gridRewarder());  
        console.log("- GridRewarder Initialized");

        // initialize Minter
        const minterArtifact = await ethers.getContractFactory("Minter");
        const minterContract = await minterArtifact.deploy(OTOKEN.address, TOKEN.address, gridRewarder.address);
        minter = await ethers.getContractAt("Minter", minterContract.address);
        console.log("- Minter Initialized");

        // initialize Multicall
        const multicallArtifact = await ethers.getContractFactory("Multicall");
        const multicallContract = await multicallArtifact.deploy(BASE.address, TOKEN.address, OTOKEN.address, TOKENRewarder.address, grid.address, gridRewarder.address, minter.address);
        multicall = await ethers.getContractAt("Multicall", multicallContract.address);
        console.log("- Multicall Initialized");

        // System set-up
        await OTOKEN.connect(owner).setMinter(minter.address);
        await minter.initialize();
        await OTOKEN.connect(owner).transfer(user1.address, oneHundred);
        await OTOKEN.connect(owner).transfer(user2.address, oneHundred);
        await OTOKEN.connect(owner).transfer(user3.address, oneHundred);
        console.log("- System set up");

        console.log("Initialization Complete");
        console.log();

    });
  
    it("BondingCurveData, owner", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(owner.address);
        console.log("GLOBAL DATA");
        console.log("Price BASE: $", divDec(res.priceBASE));
        console.log("Price TOKEN: $", divDec(res.priceTOKEN));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("MarketCap: ", divDec(res.marketCap));
        console.log("TOKEN Supply: ", divDec(res.supplyTOKEN));
        console.log("Staked Supply: ", divDec(res.supplyStaked));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Loan-to-Value: ", divDec(res.ltv), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance BASE: ", divDec(res.accountBASE));
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance TOKEN: ", divDec(res.accountTOKEN));
        console.log("Earned TOKEN: ", divDec(res.accountEarnedTOKEN));
        console.log("Balance OTOKEN: ", divDec(res.accountOTOKEN));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
        console.log("Balance Staked: ", divDec(res.accountStaked));
        console.log("Power: ", divDec(res.accountPower));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "TOKEN");
        console.log();
        console.log("Tiles Owned: ", res.accountTilesOwned);
        console.log("Tiles Placed: ", res.accountTilesPlaced);
    });

    it("Grid", async function () {
        console.log("******************************************************");
        let res = await grid.getGrid();
        for (let i = 0; i < 50; i++) {
            let row = '';
            for (let j = 0; j < 50; j++) {
                let tile = res[i][j];
                let number;
                if (tile.account == AddressZero) {
                    number = '.';
                } else if (tile.account == user1.address) {
                    number = 1;
                } else if (tile.account == user2.address) {
                    number = 2;
                } else if (tile.account == user3.address) {
                    number = 3;
                } else {
                    number = '?';
                }
                row += number + ' ';
            }
            console.log(row);
        }
    });

    it("Grid", async function () {
        console.log("******************************************************");
        let res;
        for (let i = 0; i < 50; i++) {
            let row = '';
            res = await multicall.getRow(i);
            for (let j = 0; j < 50; j++) {
                let tile = res[j];
                let number;
                if (tile.account == AddressZero) {
                    number = '.';
                } else if (tile.account == user1.address) {
                    number = 1;
                } else if (tile.account == user2.address) {
                    number = 2;
                } else if (tile.account == user3.address) {
                    number = 3;
                } else {
                    number = '?';
                }
                row += number + ' ';
            }
            console.log(row);
        }
    });

    it("User1 places a tile on [0,0]", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user1).approve(grid.address, one);
        await grid.connect(user1).placeFor(user1.address, [0], [0], 0);
    });

    it("Grid", async function () {
        console.log("******************************************************");
        let res = await grid.getGrid();
        for (let i = 0; i < 50; i++) {
            let row = '';
            for (let j = 0; j < 50; j++) {
                let tile = res[i][j];
                let number;
                if (tile.account == AddressZero) {
                    number = '.';
                } else if (tile.account == user1.address) {
                    number = 1;
                } else if (tile.account == user2.address) {
                    number = 2;
                } else if (tile.account == user3.address) {
                    number = 3;
                } else {
                    number = '?';
                }
                row += number + ' ';
            }
            console.log(row);
        }
    });

    it("BondingCurveData, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user1.address);
        console.log("GLOBAL DATA");
        console.log("Price BASE: $", divDec(res.priceBASE));
        console.log("Price TOKEN: $", divDec(res.priceTOKEN));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("MarketCap: ", divDec(res.marketCap));
        console.log("TOKEN Supply: ", divDec(res.supplyTOKEN));
        console.log("Staked Supply: ", divDec(res.supplyStaked));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Loan-to-Value: ", divDec(res.ltv), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance BASE: ", divDec(res.accountBASE));
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance TOKEN: ", divDec(res.accountTOKEN));
        console.log("Earned TOKEN: ", divDec(res.accountEarnedTOKEN));
        console.log("Balance OTOKEN: ", divDec(res.accountOTOKEN));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
        console.log("Balance Staked: ", divDec(res.accountStaked));
        console.log("Power: ", divDec(res.accountPower));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "TOKEN");
        console.log();
        console.log("Tiles Owned: ", divDec(res.accountTilesOwned));
        console.log("Tiles Placed: ", divDec(res.accountTilesPlaced));
    });

    it("User1 places a tile on [9,9]", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user1).approve(grid.address, one);
        await grid.connect(user1).placeFor(user1.address, [9], [9], 0);
    });

    it("Grid", async function () {
        console.log("******************************************************");
        let res = await grid.getGrid();
        for (let i = 0; i < 50; i++) {
            let row = '';
            for (let j = 0; j < 50; j++) {
                let tile = res[i][j];
                let number;
                if (tile.account == AddressZero) {
                    number = '.';
                } else if (tile.account == user1.address) {
                    number = 1;
                } else if (tile.account == user2.address) {
                    number = 2;
                } else if (tile.account == user3.address) {
                    number = 3;
                } else {
                    number = '?';
                }
                row += number + ' ';
            }
            console.log(row);
        }
    });

    it("User1 places a tile on many tiles", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user1).approve(grid.address, five);
        await grid.connect(user1).placeFor(user1.address, [0, 1, 1, 10, 40], [0, 4, 12, 26, 49], 0);
    });

    it("User2 places a tile on many tiles", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user2).approve(grid.address, five);
        await grid.connect(user2).placeFor(user2.address, [34, 11, 1, 10, 39], [39, 4, 2, 6, 33], 0);
    });

    it("Grid", async function () {
        console.log("******************************************************");
        let res = await grid.getGrid();
        for (let i = 0; i < 50; i++) {
            let row = '';
            for (let j = 0; j < 50; j++) {
                let tile = res[i][j];
                let number;
                if (tile.account == AddressZero) {
                    number = '.';
                } else if (tile.account == user1.address) {
                    number = 1;
                } else if (tile.account == user2.address) {
                    number = 2;
                } else if (tile.account == user3.address) {
                    number = 3;
                } else {
                    number = '?';
                }
                row += number + ' ';
            }
            console.log(row);
        }
    });

    it("User3 places a tile on many tiles", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user3).approve(grid.address, ten);
        await grid.connect(user3).placeFor(user3.address, [0, 1, 1, 10, 40, 39, 38, 37, 36, 35], [0, 4, 12, 26, 2, 39, 38, 37, 36, 35], 0);
    });

    it("User1 places a tile on many tiles", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user1).approve(grid.address, twenty);
        await grid.connect(user1).placeFor(user1.address, [0, 1, 1, 10, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30], [0, 4, 12, 26, 2, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30], 0);
    });

    it("User2 places a tile on many tiles", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user2).approve(grid.address, twenty);
        await grid.connect(user2).placeFor(user2.address, [22, 11, 1, 10, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29], [39, 4, 2, 6, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23], 0);
    });

    it("User3 places a tile on many tiles", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user3).approve(grid.address, twenty);
        await grid.connect(user3).placeFor(user3.address, [0, 1, 1, 10, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30], [0, 4, 12, 26, 2, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30], 0);
    });

    it("Grid", async function () {
        console.log("******************************************************");
        let res = await grid.getGrid();
        for (let i = 0; i < 50; i++) {
            let row = '';
            for (let j = 0; j < 50; j++) {
                let tile = res[i][j];
                let number;
                if (tile.account == AddressZero) {
                    number = '.';
                } else if (tile.account == user1.address) {
                    number = 1;
                } else if (tile.account == user2.address) {
                    number = 2;
                } else if (tile.account == user3.address) {
                    number = 3;
                } else {
                    number = '?';
                }
                row += number + ' ';
            }
            console.log(row);
        }
    });

    

  });
  