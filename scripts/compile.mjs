import solc from "solc";
import fs from "fs";

const source = fs.readFileSync("contracts/SpendingPolicy.sol", "utf-8");

const input = {
  language: "Solidity",
  sources: { "SpendingPolicy.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors?.some(e => e.severity === "error")) {
  console.error("Compilation errors:", output.errors);
  process.exit(1);
}

const contract = output.contracts["SpendingPolicy.sol"]["SpendingPolicy"];
const bytecode = contract.evm.bytecode.object;
const abi = JSON.stringify(contract.abi);

console.log("BYTECODE=0x" + bytecode);
console.log("ABI=" + abi);

// Write to file for the deploy script
fs.writeFileSync("contracts/SpendingPolicy.bin", "0x" + bytecode);
fs.writeFileSync("contracts/SpendingPolicy.abi.json", abi);
console.log("\nWritten to contracts/SpendingPolicy.bin and contracts/SpendingPolicy.abi.json");
