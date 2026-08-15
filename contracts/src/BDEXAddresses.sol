// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title BDEXAddresses — network-pinned BDEX and token addresses
/// @notice Resolves the correct address set from `block.chainid`, so pointing
/// at the wrong network is impossible rather than merely discouraged.
///
/// This exists because of a genuine trap on these chains. BDEX's core contracts
/// (factory, position manager, swap router, WBOT) sit at *identical* addresses
/// on mainnet and testnet — but the tokens do not:
///
///   0xaBabc7Dd… is canonical USDT (6 decimals) on mainnet 677,
///              and a token called "Weslie" (WES, **18 decimals**) on Bohr 968.
///
/// Hardcode the mainnet USDT address, point the app at testnet, and every
/// amount is wrong by 10^12 while every call still succeeds. Selecting by chain
/// id in code — never by an env var an operator has to remember to flip —
/// removes that failure mode.
///
/// Verified on-chain 2026-08-15. Re-check with `npm run verify:chain`.
library BDEXAddresses {
    uint256 internal constant MAINNET = 677;
    uint256 internal constant TESTNET = 968;

    struct Deployment {
        address positionManager;
        address v3Factory;
        address swapRouter;
        address pool; // USDT/WBOT, 0.3% fee tier
        address usdt; // token0
        address wbot; // token1
    }

    error UnsupportedChain(uint256 chainId);

    function current() internal view returns (Deployment memory) {
        return forChain(block.chainid);
    }

    function forChain(uint256 chainId) internal pure returns (Deployment memory) {
        if (chainId == MAINNET) {
            return Deployment({
                positionManager: 0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090,
                v3Factory: 0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419,
                swapRouter: 0x07032d47A1b9f8460cBeE9dC17c1d3E438693929,
                pool: 0x64F418471a1A7932a190E10da5A8551dB5AbeC05,
                usdt: 0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C,
                wbot: 0xD5452816194a3784dBa983426cCe7c122F4abd30
            });
        }

        if (chainId == TESTNET) {
            return Deployment({
                // Core contracts share mainnet's addresses — same deployer,
                // same nonces. The tokens and pool do not.
                positionManager: 0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090,
                v3Factory: 0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419,
                swapRouter: 0x07032d47A1b9f8460cBeE9dC17c1d3E438693929,
                pool: 0xA83dAda88e1d71810dfe89699dCE4d4E589Dd890,
                usdt: 0x75edC9335175Fc0552D51D48439F229c10420fe3,
                wbot: 0xD5452816194a3784dBa983426cCe7c122F4abd30
            });
        }

        revert UnsupportedChain(chainId);
    }
}
