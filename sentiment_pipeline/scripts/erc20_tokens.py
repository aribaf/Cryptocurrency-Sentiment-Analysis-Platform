# scripts/erc20_tokens.py
# Mapping of token contract -> symbol/decimals (Sepolia addresses)
ERC20_TOKENS = {
    # example Sepolia tokens (replace with the ones you want)
    # USDT Sepolia (example) - replace with exact Sepolia contract if different
    "0xd9bec7dbe7e2ed51eeafebbe19e6e1d651f69c78": {"symbol": "USDT", "decimals": 6},
    "0x1c7d4c14a4a61fadf48293fc02ab00d511d24333": {"symbol": "USDC", "decimals": 6},
    "0x779877a7b0d9e8603169ddbd7836e478b4624789": {"symbol": "LINK", "decimals": 18},
    # add any other tokens (lowercased keys)
}
