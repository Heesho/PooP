const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
const hre = require("hardhat");

/*===================================================================*/
/*===========================  SETTINGS  ============================*/

const MARKET_RESERVES = "1000"; // 1000 TOKEN in market reserves
const BASE_ADDRESS = "0x44D627f900da8AdaC7561bD73aA745F132450798"; // BASE Token Address (eg WETH on zkEVM)

/*===========================  END SETTINGS  ========================*/
/*===================================================================*/

// Constants
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);

// Contract Variables
let TOKENRewarderFactory, OTOKENFactory, feesFactory, gridRewarderFactory;
let TOKEN, TOKENRewarder, OTOKEN, BASE, minter, fees, multicall;
let gridNFT, gridRewarder;

/*===================================================================*/
/*===========================  CONTRACT DATA  =======================*/

async function getContracts() {
  BASE = await ethers.getContractAt("contracts/ERC20Mock.sol:ERC20Mock", "");
  OTOKENFactory = await ethers.getContractAt(
    "contracts/OTOKENFactory.sol:OTOKENFactory",
    ""
  );
  feesFactory = await ethers.getContractAt(
    "contracts/TOKENFeesFactory.sol:TOKENFeesFactory",
    ""
  );
  TOKENRewarderFactory = await ethers.getContractAt(
    "contracts/VTOKENRewarderFactory.sol:VTOKENRewarderFactory",
    ""
  );
  gridRewarderFactory = await ethers.getContractAt(
    "contracts/GridRewarderFactory.sol:GridRewarderFactory",
    ""
  );

  TOKEN = await ethers.getContractAt("contracts/TOKEN.sol:TOKEN", "");
  OTOKEN = await ethers.getContractAt(
    "contracts/OTOKENFactory.sol:OTOKEN",
    await TOKEN.OTOKEN()
  );
  fees = await ethers.getContractAt(
    "contracts/TOKENFeesFactory.sol:TOKENFees",
    await TOKEN.FEES()
  );
  TOKENRewarder = await ethers.getContractAt(
    "contracts/TOKENRewarderFactory.sol:TOKENRewarder",
    await VTOKEN.rewarder()
  );

  gridNFT = await ethers.getContractAt("contracts/GridNFT.sol:GridNFT", "");
  gridRewarder = await ethers.getContractAt(
    "contracts/GridRewarderFactory.sol:GridRewarder",
    ""
  );
  minter = await ethers.getContractAt("contracts/Minter.sol:Minter", "");

  multicall = await ethers.getContractAt(
    "contracts/Multicall.sol:Multicall",
    ""
  );

  console.log("Contracts Retrieved");
}

/*===========================  END CONTRACT DATA  ===================*/
/*===================================================================*/

async function deployBASE() {
  console.log("Starting BASE Deployment");
  const BASEArtifact = await ethers.getContractFactory(
    "WETH",
    "WETH",
    "ERC20Mock"
  );
  const BASEContract = await BASEArtifact.deploy({ gasPrice: ethers.gasPrice });
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

async function printFactoryAddresses() {
  console.log("**************************************************************");
  console.log("OTOKENFactory: ", OTOKENFactory.address);
  console.log("TOKENRewarderFactory: ", TOKENRewarderFactory.address);
  console.log("FeesFactory: ", feesFactory.address);
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
      rewarder.address,
      TOKEN.address,
      BASE.address,
      OTOKEN.address,
    ],
  });
  console.log("TOKENFees Verified");
}

async function deployGridNFT() {
  console.log("Starting GridNFT Deployment");
  const minterArtifact = await ethers.getContractFactory("Minter");
  const minterContract = await minterArtifact.deploy(
    voter.address,
    TOKEN.address,
    TOKENRewarder.address,
    OTOKEN.address,
    { gasPrice: ethers.gasPrice }
  );
  minter = await minterContract.deployed();
  await sleep(5000);
  console.log("Minter Deployed at:", minter.address);
}

async function deployMinter() {
  console.log("Starting Minter Deployment");
  const minterArtifact = await ethers.getContractFactory("Minter");
  const minterContract = await minterArtifact.deploy(
    voter.address,
    TOKEN.address,
    TOKENRewarder.address,
    OTOKEN.address,
    { gasPrice: ethers.gasPrice }
  );
  minter = await minterContract.deployed();
  await sleep(5000);
  console.log("Minter Deployed at:", minter.address);
}

async function printVotingAddresses() {
  console.log("**************************************************************");
  console.log("GaugeFactory: ", gaugeFactory.address);
  console.log("BribeFactory: ", bribeFactory.address);
  console.log("Voter: ", voter.address);
  console.log("Minter: ", minter.address);
  console.log("**************************************************************");
}

async function verifyGaugeFactory(wallet) {
  console.log("Starting GaugeFactory Verification");
  await hre.run("verify:verify", {
    address: gaugeFactory.address,
    contract: "contracts/GaugeFactory.sol:GaugeFactory",
    constructorArguments: [wallet],
  });
  console.log("GaugeFactory Verified");
}

async function verifyBribeFactory(wallet) {
  console.log("Starting BribeFactory Verification");
  await hre.run("verify:verify", {
    address: bribeFactory.address,
    contract: "contracts/BribeFactory.sol:BribeFactory",
    constructorArguments: [wallet],
  });
  console.log("BribeFactory Verified");
}

async function verifyVoter() {
  console.log("Starting Voter Verification");
  await hre.run("verify:verify", {
    address: voter.address,
    contract: "contracts/Voter.sol:Voter",
    constructorArguments: [
      VTOKEN.address,
      gaugeFactory.address,
      bribeFactory.address,
    ],
  });
  console.log("Voter Verified");
}

async function verifyMinter() {
  console.log("Starting Minter Verification");
  await hre.run("verify:verify", {
    address: minter.address,
    contract: "contracts/Minter.sol:Minter",
    constructorArguments: [
      voter.address,
      TOKEN.address,
      VTOKEN.address,
      OTOKEN.address,
    ],
  });
  console.log("Minter Verified");
}

async function deployMulticall() {
  console.log("Starting Multicall Deployment");
  const multicallArtifact = await ethers.getContractFactory("Multicall");
  const multicallContract = await multicallArtifact.deploy(
    voter.address,
    BASE_ADDRESS,
    TOKEN.address,
    OTOKEN.address,
    VTOKEN.address,
    rewarder.address,
    { gasPrice: ethers.gasPrice }
  );
  multicall = await multicallContract.deployed();
  await sleep(5000);
  console.log("Multicall Deployed at:", multicall.address);
}

async function deployController() {
  console.log("Starting Controller Deployment");
  const controllerArtifact = await ethers.getContractFactory("Controller");
  const controllerContract = await controllerArtifact.deploy(
    voter.address,
    fees.address,
    { gasPrice: ethers.gasPrice }
  );
  controller = await controllerContract.deployed();
  await sleep(5000);
  console.log("Controller Deployed at:", controller.address);
}

async function printAncillaryAddresses() {
  console.log("**************************************************************");
  console.log("Multicall: ", multicall.address);
  console.log("Controller: ", controller.address);
  console.log("**************************************************************");
}

async function verifyMulticall() {
  console.log("Starting Multicall Verification");
  await hre.run("verify:verify", {
    address: multicall.address,
    contract: "contracts/Multicall.sol:Multicall",
    constructorArguments: [
      voter.address,
      BASE_ADDRESS,
      TOKEN.address,
      OTOKEN.address,
      VTOKEN.address,
      rewarder.address,
    ],
  });
  console.log("Multicall Verified");
}

async function verifyController() {
  console.log("Starting Controller Verification");
  await hre.run("verify:verify", {
    address: controller.address,
    contract: "contracts/Controller.sol:Controller",
    constructorArguments: [voter.address, fees.address],
  });
  console.log("Controller Verified");
}

async function setUpSystem(wallet) {
  console.log("Starting System Set Up");

  let amount = await OTOKEN.totalSupply();
  amount = amount.div(10);
  await OTOKEN.approve(VTOKEN.address, amount);
  await VTOKEN.burnFor(BUILDER_ADDRESS, amount);
  amount = await OTOKEN.balanceOf(wallet);
  await OTOKEN.transfer(MULTISIG, amount);
  console.log("OTOKEN Allocated");

  await sleep(5000);
  await gaugeFactory.setVoter(voter.address);
  await sleep(5000);
  await bribeFactory.setVoter(voter.address);
  await sleep(5000);
  console.log("Factories Set Up");

  await VTOKEN.addReward(TOKEN.address);
  await sleep(5000);
  await VTOKEN.addReward(OTOKEN.address);
  await sleep(5000);
  await VTOKEN.addReward(BASE_ADDRESS);
  await sleep(5000);
  console.log("VTOKEN Rewards Set Up");

  await VTOKEN.setVoter(voter.address);
  await sleep(5000);
  await OTOKEN.setMinter(minter.address);
  await sleep(5000);
  console.log("Token-Voting Set Up");

  await voter.initialize(minter.address);
  await sleep(5000);
  await minter.initialize();
  await sleep(5000);
  console.log("System Initialized");
}

async function transferOwnership() {
  await minter.setTeam(MULTISIG);
  await sleep(5000);
  console.log("Minter team set to MULTISIG");

  await minter.transferOwnership(governor.address);
  await sleep(5000);
  console.log("Minter ownership transferred to governor");

  await voter.transferOwnership(governor.address);
  await sleep(5000);
  console.log("Voter ownership transferred to governor");

  await VTOKEN.transferOwnership(governor.address);
  await sleep(5000);
  console.log("VTOKEN ownership transferred to governor");
}

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log("Using wallet: ", wallet.address);

  await getContracts();

  //===================================================================
  // 1. Deploy Token Factories
  //===================================================================

  // console.log('Starting Factory Deployment');
  // await deployOTOKENFactory();
  // await deployVTOKENFactory();
  // await deployFeesFactory();
  // await deployRewarderFactory();
  // await printFactoryAddresses();

  /*********** UPDATE getContracts() with new addresses *************/

  //===================================================================
  // 2. Deploy Token
  //===================================================================

  // console.log('Starting Token Deployment');
  // await deployTOKEN();
  // await deployGovernor();
  // await printTokenAddresses();

  /*********** UPDATE getContracts() with new addresses *************/

  //===================================================================
  // 3. Deploy Voting System
  //===================================================================

  // console.log('Starting Voting Deployment');
  // await deployGaugeFactory(wallet.address);
  // await deployBribeFactory(wallet.address);
  // await deployVoter();
  // await deployMinter();
  // await printVotingAddresses();

  /*********** UPDATE getContracts() with new addresses *************/

  //===================================================================
  // 4. Deploy Ancillary Contracts
  //===================================================================

  // console.log('Starting Ancillary Deployment');
  // await deployMulticall();
  // await deployController();
  // await printAncillaryAddresses();

  /*********** UPDATE getContracts() with new addresses *************/

  //===================================================================
  // 5. Verify Token Contracts
  //===================================================================

  console.log("Starting Token Verification");
  await verifyTOKEN();
  await verifyOTOKEN(wallet.address);
  await verifyVTOKEN();
  await verifyTOKENFees();
  await verifyRewarder();
  await verifyGovernor();
  console.log("Token Contracts Verified");

  //===================================================================
  // 6. Verify Voting Contracts
  //===================================================================

  // console.log('Starting Voting Verification');
  // await verifyGaugeFactory(wallet.address);
  // await verifyBribeFactory(wallet.address);
  // await verifyVoter();
  // await verifyMinter();
  // console.log("Voting Contracts Verified")

  //===================================================================
  // 7. Verify Ancillary Contracts
  //===================================================================

  // console.log('Starting Ancillary Verification');
  // await verifyMulticall();
  // await verifyController();
  // console.log("Ancillary Contracts Verified")

  //===================================================================
  // 8. Set Up System
  //===================================================================

  // console.log('Starting System Set Up');
  // await setUpSystem(wallet.address);
  // console.log("System Set Up")

  //===================================================================
  // 9. Transfer Ownership
  //===================================================================

  // console.log('Starting Ownership Transfer');
  // await transferOwnership();
  // console.log("Ownership Transferred");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
