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
const fifty = convert("50", 18);
const ninety = convert("90", 18);
const oneHundred = convert("100", 18);
const twoHundred = convert("200", 18);
const fiveHundred = convert("500", 18);
const eightHundred = convert("800", 18);
const oneThousand = convert("1000", 18);

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

let owner, multisig, treasury, user0, user1, user2, user3;
let TOKENRewarderFactory, OTOKENFactory, feesFactory, gridRewarderFactory;
let TOKEN, TOKENRewarder, OTOKEN, BASE, minter, fees, multicall;
let gridNFT, gridRewarder;

describe("test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    // initialize users
    [owner, multisig, treasury, user0, user1, user2, user3] =
      await ethers.getSigners();

    // initialize ERC20Mocks
    const ERC20MockArtifact = await ethers.getContractFactory("ERC20Mock");
    BASE = await ERC20MockArtifact.deploy("BASE", "BASE");
    await BASE.mint(user1.address, oneHundred);
    await BASE.mint(user2.address, oneHundred);
    await BASE.mint(user3.address, oneHundred);
    console.log("- ERC20Mocks Initialized");

    // initialize OTOKENFactory
    const OTOKENFactoryArtifact = await ethers.getContractFactory(
      "OTOKENFactory"
    );
    OTOKENFactory = await OTOKENFactoryArtifact.deploy();
    console.log("- OTOKENFactory Initialized");

    // initialize TOKENRewarderFactory
    const TOKENRewarderFactoryArtifact = await ethers.getContractFactory(
      "TOKENRewarderFactory"
    );
    TOKENRewarderFactory = await TOKENRewarderFactoryArtifact.deploy();
    console.log("- TOKENRewarderFactory Initialized");

    // initialize FeesFactory
    const FeesFactoryArtifact = await ethers.getContractFactory(
      "TOKENFeesFactory"
    );
    feesFactory = await FeesFactoryArtifact.deploy();
    console.log("- FeesFactory Initialized");

    // initialize GridRewarderFactory
    const gridRewarderFactoryArtifact = await ethers.getContractFactory(
      "GridRewarderFactory"
    );
    gridRewarderFactory = await gridRewarderFactoryArtifact.deploy();
    console.log("- GridRewarderFactory Initialized");

    // intialize TOKEN
    const TOKENArtifact = await ethers.getContractFactory("TOKEN");
    TOKEN = await TOKENArtifact.deploy(
      BASE.address,
      OTOKENFactory.address,
      TOKENRewarderFactory.address,
      feesFactory.address
    );
    console.log("- TOKEN Initialized");

    // initialize TOKENFees
    fees = await ethers.getContractAt(
      "contracts/TOKENFeesFactory.sol:TOKENFees",
      await TOKEN.fees()
    );
    console.log("- TOKENFees Initialized");

    //initialize OTOKEN
    OTOKEN = await ethers.getContractAt(
      "contracts/OTOKENFactory.sol:OTOKEN",
      await TOKEN.OTOKEN()
    );
    console.log("- OTOKEN Initialized");

    //initialize TOKENRewarder
    TOKENRewarder = await ethers.getContractAt(
      "contracts/TOKENRewarderFactory.sol:TOKENRewarder",
      await TOKEN.rewarder()
    );
    console.log("- TOKENRewarder Initialized");

    // initialize GridNFT
    const GridNFTArtifact = await ethers.getContractFactory("GridNFT");
    const gridNFTContract = await GridNFTArtifact.deploy(
      OTOKEN.address,
      gridRewarderFactory.address,
      TOKENRewarder.address
    );
    gridNFT = await ethers.getContractAt("GridNFT", gridNFTContract.address);
    console.log("- GridNFT Initialized");

    //initialize GridRewarder
    gridRewarder = await ethers.getContractAt(
      "contracts/GridRewarderFactory.sol:GridRewarder",
      await gridNFT.gridRewarder()
    );
    console.log("- GridRewarder Initialized");

    // initialize Minter
    const minterArtifact = await ethers.getContractFactory("Minter");
    const minterContract = await minterArtifact.deploy(
      OTOKEN.address,
      TOKEN.address,
      gridRewarder.address
    );
    minter = await ethers.getContractAt("Minter", minterContract.address);
    console.log("- Minter Initialized");

    // initialize Multicall
    const multicallArtifact = await ethers.getContractFactory("Multicall");
    const multicallContract = await multicallArtifact.deploy(
      BASE.address,
      TOKEN.address,
      OTOKEN.address,
      TOKENRewarder.address,
      gridNFT.address,
      gridRewarder.address,
      minter.address
    );
    multicall = await ethers.getContractAt(
      "Multicall",
      multicallContract.address
    );
    console.log("- Multicall Initialized");

    // System set-up
    await OTOKEN.connect(owner).setMinter(minter.address);
    await minter.initialize();
    await OTOKEN.connect(owner).transfer(user1.address, oneThousand);
    console.log("- System set up");

    await gridNFT.safeMint(user1.address); // 0
    await gridNFT.safeMint(user1.address); // 1
    await gridNFT.safeMint(user1.address); // 2
    await gridNFT.safeMint(user1.address); // 3
    await gridNFT.safeMint(user1.address); // 4
    await gridNFT.safeMint(user1.address); // 5
    await gridNFT.safeMint(user1.address); // 6
    await gridNFT.safeMint(user1.address); // 7
    await gridNFT.safeMint(user1.address); // 8
    await gridNFT.safeMint(user1.address); // 9
    await gridNFT.safeMint(user1.address); // 10
    await gridNFT.safeMint(user1.address); // 11
    console.log("- GridNFTs minted");

    console.log("Initialization Complete");
    console.log();
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
  });

  it("Set colors", async function () {
    console.log("******************************************************");
    await gridNFT.setColors([
      "#000000",
      "#18fc03",
      "#fce303",
      "#fc0317",
      "#03a5fc",
      "#db03fc",
    ]);
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          0,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          1,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          2,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          3,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          4,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          5,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          6,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          7,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          8,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          9,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  it("User1 places tiles randomly", async function () {
    console.log("******************************************************");
    await OTOKEN.connect(user1).approve(gridNFT.address, fifty);
    for (let i = 0; i < 50; i++) {
      await gridNFT
        .connect(user1)
        .placeFor(
          10,
          user1.address,
          [getRndInteger(0, 9)],
          [getRndInteger(0, 9)],
          getRndInteger(0, 6)
        );
    }
  });

  // it("User 1 places on all tiles", async function () {
  //     console.log("******************************************************");
  //     await OTOKEN.connect(user1).approve(gridNFT.address, oneHundred);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 1);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], 2);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], 3);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], 4);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [5, 5, 5, 5, 5, 5, 5, 5, 5, 5], 5);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [6, 6, 6, 6, 6, 6, 6, 6, 6, 6], 1);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [7, 7, 7, 7, 7, 7, 7, 7, 7, 7], 2);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [8, 8, 8, 8, 8, 8, 8, 8, 8, 8], 3);
  //     await gridNFT.connect(user1).placeFor(0, user1.address, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [9, 9, 9, 9, 9, 9, 9, 9, 9, 9], 4);
  // });

  // it("Get encoded SVG", async function () {
  //     console.log("******************************************************");
  //     console.log(await gridNFT.generateSVG(0));
  // });

  it("Grid Data, user1, 0", async function () {
    console.log("******************************************************");
    let res = await multicall.gridData(user1.address, 0);
    console.log("GLOBAL DATA");
    console.log("Tiles Owned: ", divDec(res.tilesOwned));
    console.log("Tiles Placed: ", divDec(res.tilesPlaced));
    console.log("Tile Reward Per Week: ", divDec(res.tilesRewardForDuration));
    console.log("USER DATA");
    console.log("Tiles Owned: ", divDec(res.accountTilesOwned));
    console.log("Tiles Placed: ", divDec(res.accountTilesPlaced));
    console.log("Tiles owned on TokenId: ", res.accountTilesOwnedTokenId);
    let rowCoord = "";
    for (let i = 0; i < res.accountTilesOwnedTokenId; i++) {
      rowCoord +=
        "(" +
        res.accountTilesOwnedCoordsTokenId[i].x +
        ", " +
        res.accountTilesOwnedCoordsTokenId[i].y +
        ") ";
    }
    console.log("Owned Tiles: ", rowCoord);
    console.log("GRID DATA");
    let rowColor = "";
    for (let i = 0; i < res.colorsLength; i++) {
      rowColor += res.colors[i] + " ";
    }
    console.log("Colors: ", rowColor);
    for (let i = 0; i < 10; i++) {
      let row = "";
      for (let j = 0; j < 10; j++) {
        let tile = res.grid[i][j];
        let number;
        if (tile.account == AddressZero) {
          number = ".";
        } else if (tile.account == user1.address) {
          number = 1;
        } else if (tile.account == user2.address) {
          number = 2;
        } else if (tile.account == user3.address) {
          number = 3;
        } else {
          number = "?";
        }
        row += number + " ";
      }
      console.log(row);
    }
  });

  it("Get encoded SVGs", async function () {
    console.log("******************************************************");
    let res = await multicall.getSVGs(0, 12);
    console.log(res[0]);
    console.log();
    console.log(res[1]);
    console.log();
    console.log(res[2]);
    console.log();
    console.log(res[3]);
    console.log();
    console.log(res[4]);
    console.log();
    console.log(res[5]);
    console.log();
    console.log(res[6]);
    console.log();
    console.log(res[7]);
    console.log();
    console.log(res[8]);
    console.log();
    console.log(res[9]);
    console.log();
    console.log(res[10]);
    console.log();
    console.log(res[11]);
    console.log();
  });
});
