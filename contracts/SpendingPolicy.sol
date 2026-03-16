// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SpendingPolicy {
    address public agent;
    uint256 public maxWei;

    event PolicySet(address indexed agent, uint256 maxWei);
    event TransactionEvaluated(address indexed agent, uint256 amount, bool allowed);

    constructor(address _agent, uint256 _maxWei) {
        agent = _agent;
        maxWei = _maxWei;
        emit PolicySet(_agent, _maxWei);
    }

    function evaluate(uint256 amount) external returns (bool) {
        bool allowed = amount <= maxWei;
        emit TransactionEvaluated(agent, amount, allowed);
        return allowed;
    }
}
