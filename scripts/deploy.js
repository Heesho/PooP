const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
const hre = require("hardhat");

/*===================================================================*/
/*===========================  SETTINGS  ============================*/

/*===========================  END SETTINGS  ========================*/
/*===================================================================*/

// Constants
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);

// Contract Variables
let TOKENRewarderFactory, OTOKENFactory, feesFactory, gridRewarderFactory;
let BASE, TOKEN, TOKENRewarder, OTOKEN, fees;
let gridNFT, gridRewarder, minter, multicall;

/*===================================================================*/
/*===========================  CONTRACT DATA  =======================*/

async function getContracts() {
  BASE = await ethers.getContractAt(
    "contracts/ERC20Mock.sol:ERC20Mock",
    "0x1E9C07E3731981575717EE825e4d54C735925F50"
  );
  OTOKENFactory = await ethers.getContractAt(
    "contracts/OTOKENFactory.sol:OTOKENFactory",
    "0x2E2d8D7c9Bf746ccE7F0F2B26bebe42dd25E9486"
  );
  feesFactory = await ethers.getContractAt(
    "contracts/TOKENFeesFactory.sol:TOKENFeesFactory",
    "0x6D73eAED34759D676f446dAF5d395B130c68eeAF"
  );
  TOKENRewarderFactory = await ethers.getContractAt(
    "contracts/TOKENRewarderFactory.sol:TOKENRewarderFactory",
    "0x0D8109885CC10EEE4ee3cefCfDfB25C4b84d3c59"
  );
  gridRewarderFactory = await ethers.getContractAt(
    "contracts/GridRewarderFactory.sol:GridRewarderFactory",
    "0xeC98283277704D69D8cE653d284df97Fcc2f420d"
  );

  TOKEN = await ethers.getContractAt(
    "contracts/TOKEN.sol:TOKEN",
    "0x3b53Da4DE9B159e3EB70aC6763023f529ea89CA1"
  );
  OTOKEN = await ethers.getContractAt(
    "contracts/OTOKENFactory.sol:OTOKEN",
    await TOKEN.OTOKEN()
  );
  fees = await ethers.getContractAt(
    "contracts/TOKENFeesFactory.sol:TOKENFees",
    await TOKEN.fees()
  );
  TOKENRewarder = await ethers.getContractAt(
    "contracts/TOKENRewarderFactory.sol:TOKENRewarder",
    await TOKEN.rewarder()
  );

  gridNFT = await ethers.getContractAt(
    "contracts/GridNFT.sol:GridNFT",
    "0xde84d1E00cA5c27F598dea68320F25167fde308F"
  );
  gridRewarder = await ethers.getContractAt(
    "contracts/GridRewarderFactory.sol:GridRewarder",
    "0xA0377Fe6d61f8D568344dBD3bEBb5D3721931Ab6"
  );
  minter = await ethers.getContractAt(
    "contracts/Minter.sol:Minter",
    "0x5bB6134c6a4559dDBa0c60b1AcE7c2597E91E7e2"
  );

  multicall = await ethers.getContractAt(
    "contracts/Multicall.sol:Multicall",
    "0xA63d0130b65a68aAFf0F4A07Dbd5d7d927EC6C8a"
  );

  console.log("Contracts Retrieved");
}

/*===========================  END CONTRACT DATA  ===================*/
/*===================================================================*/

async function deployBASE() {
  console.log("Starting BASE Deployment");
  const BASEArtifact = await ethers.getContractFactory("ERC20Mock");
  const BASEContract = await BASEArtifact.deploy("WETH", "WETH", {
    gasPrice: ethers.gasPrice,
  });
  BASE = await BASEContract.deployed();
  await sleep(5000);
  console.log("BASE Deployed at:", BASE.address);
}

async function deployOTOKENFactory() {
  console.log("Starting OTOKENFactory Deployment");
  const OTOKENFactoryArtifact = await ethers.getContractFactory(
    "OTOKENFactory"
  );
  const OTOKENFactoryContract = await OTOKENFactoryArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  OTOKENFactory = await OTOKENFactoryContract.deployed();
  await sleep(5000);
  console.log("OTOKENFactory Deployed at:", OTOKENFactory.address);
}

async function deployTOKENRewarderFactory() {
  console.log("Starting TOKENRewarderFactory Deployment");
  const TOKENRewarderFactoryArtifact = await ethers.getContractFactory(
    "TOKENRewarderFactory"
  );
  const TOKENRewarderFactoryContract =
    await TOKENRewarderFactoryArtifact.deploy({ gasPrice: ethers.gasPrice });
  TOKENRewarderFactory = await TOKENRewarderFactoryContract.deployed();
  await sleep(5000);
  console.log(
    "TOKENRewarderFactory Deployed at:",
    TOKENRewarderFactory.address
  );
}

async function deployFeesFactory() {
  console.log("Starting FeesFactory Deployment");
  const feesFactoryArtifact = await ethers.getContractFactory(
    "TOKENFeesFactory"
  );
  const feesFactoryContract = await feesFactoryArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  feesFactory = await feesFactoryContract.deployed();
  await sleep(5000);
  console.log("FeesFactory Deployed at:", feesFactory.address);
}

async function deployGridRewarderFactory() {
  console.log("Starting GridRewarderFactory Deployment");
  const gridRewarderFactoryArtifact = await ethers.getContractFactory(
    "GridRewarderFactory"
  );
  const gridRewarderFactoryContract = await gridRewarderFactoryArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  gridRewarderFactory = await gridRewarderFactoryContract.deployed();
  await sleep(5000);
  console.log("GridRewarderFactory Deployed at:", gridRewarderFactory.address);
}

async function printFactoryAddresses() {
  console.log("**************************************************************");
  console.log("OTOKENFactory: ", OTOKENFactory.address);
  console.log("TOKENRewarderFactory: ", TOKENRewarderFactory.address);
  console.log("FeesFactory: ", feesFactory.address);
  console.log("GridRewarderFactory: ", gridRewarderFactory.address);
  console.log("**************************************************************");
}

async function deployTOKEN() {
  console.log("Starting TOKEN Deployment");
  const TOKENArtifact = await ethers.getContractFactory("TOKEN");
  const TOKENContract = await TOKENArtifact.deploy(
    BASE.address,
    OTOKENFactory.address,
    TOKENRewarderFactory.address,
    feesFactory.address,
    { gasPrice: ethers.gasPrice }
  );
  TOKEN = await TOKENContract.deployed();
  OTOKEN = await ethers.getContractAt(
    "contracts/OTOKENFactory.sol:OTOKEN",
    await TOKEN.OTOKEN()
  );
  TOKENRewarder = await ethers.getContractAt(
    "contracts/TOKENRewarderFactory.sol:TOKENRewarder",
    await TOKEN.rewarder()
  );
  fees = await ethers.getContractAt(
    "contracts/TOKENFeesFactory.sol:TOKENFees",
    await TOKEN.fees()
  );
  await sleep(5000);
  console.log("TOKEN Deployed at:", TOKEN.address);
}

async function printTokenAddresses() {
  console.log("**************************************************************");
  console.log("TOKEN: ", TOKEN.address);
  console.log("OTOKEN: ", OTOKEN.address);
  console.log("TOKENRewarder: ", TOKENRewarder.address);
  console.log("Fees: ", fees.address);
  console.log("**************************************************************");
}

async function verifyTOKEN() {
  console.log("Starting TOKEN Verification");
  await hre.run("verify:verify", {
    address: TOKEN.address,
    contract: "contracts/TOKEN.sol:TOKEN",
    constructorArguments: [
      BASE.address,
      OTOKENFactory.address,
      TOKENRewarderFactory.address,
      feesFactory.address,
    ],
  });
  console.log("TOKEN Verified");
}

async function verifyOTOKEN(wallet) {
  console.log("Starting OTOKEN Verification");
  await hre.run("verify:verify", {
    address: OTOKEN.address,
    contract: "contracts/OTOKENFactory.sol:OTOKEN",
    constructorArguments: [wallet],
  });
  console.log("OTOKEN Verified");
}

async function verifyTOKENRewarder() {
  console.log("Starting TOKENRewarder Verification");
  await hre.run("verify:verify", {
    address: TOKENRewarder.address,
    contract: "contracts/TOKENRewarderFactory.sol:TOKENRewarder",
    constructorArguments: [TOKEN.address, OTOKEN.address],
  });
  console.log("TOKENRewarder Verified");
}

async function verifyTOKENFees() {
  console.log("TOKENFees Deployed at:", fees.address);
  console.log("Starting TOKENFees Verification");
  await hre.run("verify:verify", {
    address: await fees.address,
    contract: "contracts/TOKENFeesFactory.sol:TOKENFees",
    constructorArguments: [
      TOKENRewarder.address,
      TOKEN.address,
      BASE.address,
      OTOKEN.address,
    ],
  });
  console.log("TOKENFees Verified");
}

async function deployGridNFT() {
  console.log("Starting GridNFT Deployment");
  const gridNFTArtifact = await ethers.getContractFactory("GridNFT");
  const gridNFTContract = await gridNFTArtifact.deploy(
    OTOKEN.address,
    gridRewarderFactory.address,
    TOKENRewarder.address,
    { gasPrice: ethers.gasPrice }
  );
  gridNFT = await gridNFTContract.deployed();
  await sleep(5000);
  console.log("gridNFT Deployed at:", gridNFT.address);
}

async function deployMinter() {
  console.log("Starting Minter Deployment");
  const minterArtifact = await ethers.getContractFactory("Minter");
  const minterContract = await minterArtifact.deploy(
    OTOKEN.address,
    TOKEN.address,
    TOKENRewarder.address,
    { gasPrice: ethers.gasPrice }
  );
  minter = await minterContract.deployed();
  await sleep(5000);
  console.log("Minter Deployed at:", minter.address);
}

async function printGridAddresses() {
  console.log("**************************************************************");
  console.log("GridNFT: ", gridNFT.address);
  console.log("GridRewarder: ", await gridNFT.gridRewarder());
  console.log("Minter: ", minter.address);
  console.log("**************************************************************");
}

async function verifyGridNFT() {
  console.log("Starting GridNFT Verification");
  await hre.run("verify:verify", {
    address: gridNFT.address,
    contract: "contracts/GridNFT.sol:GridNFT",
    constructorArguments: [
      OTOKEN.address,
      gridRewarderFactory.address,
      TOKENRewarder.address,
    ],
  });
  console.log("Minter Verified");
}

async function verifyGridRewarder() {
  console.log("Starting GridRewarder Verification");
  await hre.run("verify:verify", {
    address: gridRewarder.address,
    contract: "contracts/GridRewarderFactory.sol:GridRewarder",
    constructorArguments: [gridNFT.address],
  });
  console.log("Minter Verified");
}

async function verifyMinter() {
  console.log("Starting Minter Verification");
  await hre.run("verify:verify", {
    address: minter.address,
    contract: "contracts/Minter.sol:Minter",
    constructorArguments: [
      OTOKEN.address,
      TOKEN.address,
      TOKENRewarder.address,
    ],
  });
  console.log("Minter Verified");
}

async function deployMulticall() {
  console.log("Starting Multicall Deployment");
  const multicallArtifact = await ethers.getContractFactory("Multicall");
  const multicallContract = await multicallArtifact.deploy(
    BASE.address,
    TOKEN.address,
    OTOKEN.address,
    TOKENRewarder.address,
    gridNFT.address,
    gridRewarder.address,
    minter.address,
    { gasPrice: ethers.gasPrice }
  );
  multicall = await multicallContract.deployed();
  await sleep(5000);
  console.log("Multicall Deployed at:", multicall.address);
}

async function printAncillaryAddresses() {
  console.log("**************************************************************");
  console.log("Multicall: ", multicall.address);
  console.log("**************************************************************");
}

async function verifyMulticall() {
  console.log("Starting Multicall Verification");
  await hre.run("verify:verify", {
    address: multicall.address,
    contract: "contracts/Multicall.sol:Multicall",
    constructorArguments: [
      BASE.address,
      TOKEN.address,
      OTOKEN.address,
      TOKENRewarder.address,
      gridNFT.address,
      gridRewarder.address,
      minter.address,
    ],
  });
  console.log("Multicall Verified");
}

async function setUpSystem(wallet) {
  console.log("Starting System Set Up");

  await OTOKEN.setMinter(minter.address);
  await sleep(5000);
  await minter.initialize();
  await sleep(5000);

  await gridNFT.safeMint(wallet); // 0
  await sleep(5000);
  await gridNFT.safeMint(wallet); // 1
  await sleep(5000);
  await gridNFT.safeMint(wallet); // 2
  await sleep(5000);
  await gridNFT.safeMint(wallet); // 3

  console.log("System Initialized");
}

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log("Using wallet: ", wallet.address);

  await getContracts();

  //===================================================================
  // 1. Deploy Token Factories
  //===================================================================

  // console.log("Starting Factory Deployments");
  // await deployBASE();
  // await deployOTOKENFactory();
  // await deployTOKENRewarderFactory();
  // await deployFeesFactory();
  // await deployGridRewarderFactory();
  // await printFactoryAddresses();

  /*********** UPDATE getContracts() with new addresses *************/

  //===================================================================
  // 2. Deploy Token
  //===================================================================

  // console.log("Starting Token Deployment");
  // await deployTOKEN();
  // await printTokenAddresses();

  /*********** UPDATE getContracts() with new addresses *************/

  //===================================================================
  // 3. Deploy Grid System
  //===================================================================

  // console.log("Starting Grid Deployment");
  // await deployGridNFT();
  // await deployMinter();
  // await printGridAddresses();

  /*********** UPDATE getContracts() with new addresses *************/

  //===================================================================
  // 4. Deploy Ancillary Contracts
  //===================================================================

  console.log("Starting Ancillary Deployment");
  await deployMulticall();
  await printAncillaryAddresses();

  /*********** UPDATE getContracts() with new addresses *************/

  //===================================================================
  // 5. Verify Token Contracts
  //===================================================================

  // console.log("Starting Token Verification");
  // await verifyTOKEN();
  // await verifyOTOKEN(wallet.address);
  // await verifyTOKENRewarder();
  // await verifyTOKENFees();
  // console.log("Token Contracts Verified");

  //===================================================================
  // 6. Verify Voting Contracts
  //===================================================================

  // console.log("Starting Voting Verification");
  // await verifyGridNFT();
  // await verifyGridRewarder();
  // await verifyMinter();
  // console.log("Voting Contracts Verified");

  //===================================================================
  // 7. Verify Ancillary Contracts
  //===================================================================

  // console.log("Starting Ancillary Verification");
  // await verifyMulticall();
  // console.log("Ancillary Contracts Verified");

  //===================================================================
  // 8. Set Up System
  //===================================================================

  console.log("Starting System Set Up");
  await setUpSystem(wallet.address);
  console.log("System Set Up");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
