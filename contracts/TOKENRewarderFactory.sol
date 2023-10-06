// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface ITOKEN {
    function debts(address account) external view returns (uint256);
    function FEES() external view returns (address);
}

interface IOTOKEN {
    function burnFrom(address account, uint256 amount) external;
}

/**
 * @title VTOKENRewarder
 * @author heesho
 * 
 * VTOKENRewarder distributes rewards to VTOKEN stakers. The VTOKEN contract will deposit/withdraw virtual balances
 * to this contract based on when users deposit/withdraw/burn in the VTOKEN contract. The user balance in this contract
 * should always be equal to the users voting power in the VTOKEN contract. 
 * 
 * The VTOKENRewarder balanceOf must always be equal to VTOKEN balanceOf for all accounts at all times.
 * The VTOKENRewarder totalSupply must always be equal to VTOKEN totalSupply at all times.
 */
contract TOKENRewarder is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant DURATION = 7 days; // rewards are released over 7 days

    /*----------  STATE VARIABLES  --------------------------------------*/

    IERC20 public immutable TOKEN;      // TOKEN address
    IERC20 public immutable OTOKEN;     // OTOKEN address

    // struct to hold reward data for each reward token
    struct Reward {
        uint256 periodFinish;           // timestamp when reward period ends
        uint256 rewardRate;             // reward rate per second
        uint256 lastUpdateTime;         // timestamp when reward was last updated
        uint256 rewardPerTokenStored;   // reward per virtual token 
    }

    mapping(address => Reward) public rewardData;   // reward token -> Reward struct
    mapping(address => bool) public isRewardToken;  // reward token -> true if is reward token
    address[] public rewardTokens;                  // array of reward tokens

    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;  // user -> reward token -> reward per virtual token paid
    mapping(address => mapping(address => uint256)) public rewards;                 // user -> reward token -> reward amount

    uint256 private _totalSupply;                   // total virtual token supply
    mapping(address => uint256) private _balances;  // user -> virtual token balance

    uint256 private _totalSupplyTOKEN;                   // total supply of TOKEN deposited
    mapping(address => uint256) private _balancesTOKEN;  // balances of TOKEN deposited

    /*----------  ERRORS ------------------------------------------------*/

    error TOKENRewarder__NotAuthorizedTOKEN();
    error TOKENRewarder__RewardSmallerThanDuration();
    error TOKENRewarder__NotRewardToken();
    error TOKENRewarder__RewardTokenAlreadyAdded();
    error TOKENRewarder__InvalidZeroInput();
    error TOKENRewarder__InvalidZeroAddress();
    error TOKENRewarder__CollateralActive();

    /*----------  EVENTS ------------------------------------------------*/

    event TOKENRewarder__RewardAdded(address indexed rewardToken);
    event TOKENRewarder__RewardNotified(address indexed rewardToken, uint256 reward);
    event TOKENRewarder__Deposited(address indexed user, uint256 amount);
    event TOKENRewarder__Withdrawn(address indexed user, uint256 amount);
    event TOKENRewarder__BurnedFor(address indexed burner, address indexed account, uint256 amount);
    event TOKENRewarder__RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier onlyToken() {
        if (msg.sender != address(TOKEN)) revert TOKENRewarder__NotAuthorizedTOKEN();
        _;
    }

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert TOKENRewarder__InvalidZeroInput();
        _;
    }

    modifier nonZeroAddress(address _account) {
        if (_account == address(0)) revert TOKENRewarder__InvalidZeroAddress();
        _;
    }

    modifier updateReward(address account) {
        for (uint256 i; i < rewardTokens.length; i++) {
            address token = rewardTokens[i];
            rewardData[token].rewardPerTokenStored = rewardPerToken(token);
            rewardData[token].lastUpdateTime = lastTimeRewardApplicable(token);
            if (account != address(0)) {
                rewards[account][token] = earned(account, token);
                userRewardPerTokenPaid[account][token] = rewardData[token].rewardPerTokenStored;
            }
        }
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice Constructs a new TOKENRewarder contract.
     */
    constructor(address _TOKEN, address _OTOKEN) {
        TOKEN = IERC20(_TOKEN);
        OTOKEN = IERC20(_OTOKEN);
    }

    /**
     * @notice Claim rewards accrued for an account. Claimed rewards are sent to the account.
     * @param account the account to claim rewards for
     */
    function getReward(address account) 
        external
        nonReentrant
        updateReward(account) 
    {
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address _rewardsToken = rewardTokens[i];
            uint256 reward = rewards[account][_rewardsToken];
            if (reward > 0) {
                rewards[account][_rewardsToken] = 0;
                emit TOKENRewarder__RewardPaid(account, _rewardsToken, reward);

                IERC20(_rewardsToken).safeTransfer(account, reward);
            }
        }
    }

    /**
     * @notice Begin reward distribution to accounts with non-zero balances. Transfers tokens from msg.sender
     *         to this contract and begins accounting for distribution with new reward token rates. Anyone 
     *         can call this function on existing reward tokens.
     * @param _rewardsToken the reward token to begin distribution for
     * @param reward the amount of reward tokens to distribute
     */
    function notifyRewardAmount(address _rewardsToken, uint256 reward) 
        external 
        nonReentrant 
        updateReward(address(0)) 
    {
        if (reward < DURATION) revert TOKENRewarder__RewardSmallerThanDuration();
        if (!isRewardToken[_rewardsToken]) revert TOKENRewarder__NotRewardToken();

        IERC20(_rewardsToken).safeTransferFrom(msg.sender, address(this), reward);
        if (block.timestamp >= rewardData[_rewardsToken].periodFinish) {
            rewardData[_rewardsToken].rewardRate = reward / DURATION;
        } else {
            uint256 remaining = rewardData[_rewardsToken].periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardData[_rewardsToken].rewardRate;
            rewardData[_rewardsToken].rewardRate = (reward + leftover) / DURATION;
        }
        rewardData[_rewardsToken].lastUpdateTime = block.timestamp;
        rewardData[_rewardsToken].periodFinish = block.timestamp + DURATION;
        emit TOKENRewarder__RewardNotified(_rewardsToken, reward);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /**
     * @notice Deposits a virtual amount of tokens for account. No tokens are actually being deposited,
     *         this is reward accounting for VTOKEN balances. Only VTOKEN contract can call this function.
     * @param amount the amount of tokens to deposit
     */
    function deposit(uint256 amount) 
        external
        nonReentrant
        nonZeroInput(amount)
        updateReward(msg.sender)
    {
        address account = msg.sender;
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        _totalSupplyTOKEN += amount;
        _balancesTOKEN[account] += amount;
        emit TOKENRewarder__Deposited(account, amount);
        TOKEN.safeTransferFrom(account, address(this), amount);
    }

    /**
     * @notice Withdraws a virtual amount of tokens for account. No tokens are actually being withdrawn,
     *         this is reward accounting for VTOKEN balances. Only VTOKEN contract can call this function.
     * @param amount the amount of virtual tokens to withdraw
     */
    function withdraw(uint256 amount) 
        external  
        nonReentrant
        nonZeroInput(amount)
        updateReward(msg.sender)
    {
        address account = msg.sender;
        _totalSupply = _totalSupply - amount;
        _balances[account] = _balances[account] - amount;
        _totalSupplyTOKEN -= amount;
        _balancesTOKEN[account] -= amount;
        if (_balancesTOKEN[account] < ITOKEN(address(TOKEN)).debts(account) * 10000) revert TOKENRewarder__CollateralActive(); // incorrect calc must fix
        emit TOKENRewarder__Withdrawn(account, amount);
    }

    /**
     * @notice Burns VTOKEN to mint TOKEN for account. Voting Power is increased but VTOKEN balance doesnt change.
     *         This is a permamenent action and cannot be undone. Voting Power can never be withdrawn, but provides
     *         a Voting Power which earns bonding curve fees and voting rewards. However voting power can not be used
     *         as collateral.
     * @param account account to give voting power to from burn OTOKEN
     * @param amount amount of OTOKEN to burn
     */
    function burnFor(address account, uint256 amount) 
        external
        nonReentrant
        nonZeroInput(amount)
        nonZeroAddress(account)
    {
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        emit TOKENRewarder__BurnedFor(msg.sender, account, amount);

        IOTOKEN(address(OTOKEN)).burnFrom(msg.sender, amount);
    }

    /**
     * @notice Adds a reward token for distribution. Only VTOKEN contract can call this function.
     * @param _rewardsToken the reward token to add
     */
    function addReward(address _rewardsToken) 
        external
        onlyToken
     {
        if (isRewardToken[_rewardsToken]) revert TOKENRewarder__RewardTokenAlreadyAdded();
        isRewardToken[_rewardsToken] = true;
        rewardTokens.push(_rewardsToken);
        emit TOKENRewarder__RewardAdded(_rewardsToken);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function left(address _rewardsToken) external view returns (uint256 leftover) {
        if (block.timestamp >= rewardData[_rewardsToken].periodFinish) return 0;
        uint256 remaining = rewardData[_rewardsToken].periodFinish - block.timestamp;
        return remaining * rewardData[_rewardsToken].rewardRate;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function totalSupplyTOKEN() external view returns (uint256) {
        return _totalSupplyTOKEN;
    }

    function balanceOfTOKEN(address account) external view returns (uint256) {
        return _balancesTOKEN[account];
    }

    function getRewardTokens() external view returns (address[] memory) {
        return rewardTokens;
    }

    function lastTimeRewardApplicable(address _rewardsToken) public view returns (uint256) {
        return Math.min(block.timestamp, rewardData[_rewardsToken].periodFinish);
    }

    function rewardPerToken(address _rewardsToken) public view returns (uint256) {
        if (_totalSupply == 0) return rewardData[_rewardsToken].rewardPerTokenStored;
        return
            rewardData[_rewardsToken].rewardPerTokenStored + ((lastTimeRewardApplicable(_rewardsToken) - rewardData[_rewardsToken].lastUpdateTime) 
            * rewardData[_rewardsToken].rewardRate * 1e18 / _totalSupply);
    }

    function earned(address account, address _rewardsToken) public view returns (uint256) {
        return
            (_balances[account] * (rewardPerToken(_rewardsToken) - userRewardPerTokenPaid[account][_rewardsToken]) / 1e18) 
            + rewards[account][_rewardsToken];
    }

    function getRewardForDuration(address _rewardsToken) external view returns (uint256) {
        return rewardData[_rewardsToken].rewardRate * DURATION;
    }

    function getMaxWithdraw(address _account) external view returns (uint256) {
        return _balancesTOKEN[_account] - ITOKEN(address(TOKEN)).debts(_account) * 10000;
    }

}


contract TOKENRewarderFactory {

    event TOKENRewarderFactory__TOKENRewarderCreated(address indexed TOKENRewarder);

    constructor() {}

    function createTokenRewarder(address _TOKEN, address _OTOKEN) external returns (address tokenRewarder) {
        tokenRewarder = address(new TOKENRewarder(_TOKEN, _OTOKEN));
        emit TOKENRewarderFactory__TOKENRewarderCreated(tokenRewarder);
    }
}