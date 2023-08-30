// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ITOKENRewarder {
    function notifyRewardAmount(address token, uint amount) external;
}

/**
 * @title TOKENFees
 * @author heesho
 * 
 * TOKENFees collects fees from bonding curve (TOKEN contract) and distributed 
 * them to VTOKEN stakers (Rewarder) and treasury.
 */
contract TOKENFees {
    using SafeERC20 for IERC20;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable rewarder;    // rewarder address to distribute fees to TOKEN stakers
    IERC20 public immutable TOKEN;      // TOKEN address
    IERC20 public immutable BASE;       // BASE address
    IERC20 public immutable OTOKEN;     // OTOKEN address

    /*----------  EVENTS ------------------------------------------------*/

    event TOKENFees__DistributedTOKEN(uint256 amount);
    event TOKENFees__DistributedBASE(uint256 amount);
    event TOKENFees__DistributedOTOKEN(uint256 amount);

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice constructs a new TOKENFees contract
     * @param _rewarder address of the rewarder contract
     * @param _TOKEN address of TOKEN contract
     * @param _BASE address of BASE contract
     * @param _OTOKEN address of OTOKEN contract
     */
    constructor(address _rewarder, address _TOKEN, address _BASE, address _OTOKEN) {
        rewarder = _rewarder;
        TOKEN = IERC20(_TOKEN);
        BASE = IERC20(_BASE);
        OTOKEN = IERC20(_OTOKEN);
    }

    /**
     * @notice distributes all fees to VTOKEN stakers and treasury
     */
    function distribute() external {
        distributeBASE();
        distributeTOKEN();
        distributeOTOKEN();
    }

    /**
     * @notice distributes BASE to treasury and VTOKEN stakers
     */
    function distributeBASE() public {
        uint256 balanceBASE = BASE.balanceOf(address(this));
        emit TOKENFees__DistributedBASE(balanceBASE);

        BASE.safeApprove(rewarder, 0);
        BASE.safeApprove(rewarder, balanceBASE);
        ITOKENRewarder(rewarder).notifyRewardAmount(address(BASE), balanceBASE);
    }

    /**
     * @notice distributes TOKEN to treasury and VTOKEN stakers
     */
    function distributeTOKEN() public {
        uint256 balanceTOKEN = TOKEN.balanceOf(address(this));
        emit TOKENFees__DistributedTOKEN(balanceTOKEN);

        TOKEN.safeApprove(rewarder, 0);
        TOKEN.safeApprove(rewarder, balanceTOKEN);
        ITOKENRewarder(rewarder).notifyRewardAmount(address(TOKEN), balanceTOKEN);
    }

    /**
     * @notice distributes OTOKEN to VTOKEN stakers
     */
    function distributeOTOKEN() public {
        uint256 balanceOTOKEN = OTOKEN.balanceOf(address(this));
        emit TOKENFees__DistributedOTOKEN(balanceOTOKEN);

        OTOKEN.safeApprove(rewarder, 0);
        OTOKEN.safeApprove(rewarder, balanceOTOKEN);
        ITOKENRewarder(rewarder).notifyRewardAmount(address(OTOKEN), balanceOTOKEN);
    }

}


contract TOKENFeesFactory {

    event TOKENFeesFactory__TokenFeesCreated(address indexed tokenFees);

    constructor() {}

    function createTokenFees(address _rewarder, address _TOKEN, address _BASE, address _OTOKEN) external returns (address) {
        TOKENFees tokenFees = new TOKENFees(_rewarder, _TOKEN, _BASE, _OTOKEN);
        emit TOKENFeesFactory__TokenFeesCreated(address(tokenFees));
        return address(tokenFees);
    }
}