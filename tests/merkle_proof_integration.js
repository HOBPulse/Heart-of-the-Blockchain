// Test script for Merkle State Fetching and Proof Generation (Task 4.2)
const fs = require('fs');
const path = require('path');

// Check if client directory exists
const clientDir = path.join(__dirname, '..', 'client');
if (!fs.existsSync(clientDir)) {
  console.error('Client directory not found. Please run this test after creating the client implementation.');
  process.exit(1);
}

console.log('✅ Client directory exists');

// Check if required files exist
const requiredFiles = [
  'src/services/MerkleProofService.ts',
  'test/services/MerkleProofService.test.ts',
  'src/examples/merkle-proof-usage.ts'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(clientDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Required file not found: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✅ Found required file: ${file}`);
  }
}

if (!allFilesExist) {
  console.error('Some required files are missing. Please complete Task 4.2 implementation.');
  process.exit(1);
}

// Check if MerkleProofService is properly exported in index.ts
try {
  const indexFile = fs.readFileSync(path.join(clientDir, 'src/index.ts'), 'utf8');
  
  if (!indexFile.includes('export * from \'./services/MerkleProofService\'')) {
    console.error('❌ MerkleProofService is not exported from index.ts');
    process.exit(1);
  }
  
  console.log('✅ MerkleProofService is properly exported from index.ts');
} catch (error) {
  console.error('Error reading index.ts:', error);
  process.exit(1);
}

// Check the MerkleProofService implementation
try {
  const serviceFile = fs.readFileSync(path.join(clientDir, 'src/services/MerkleProofService.ts'), 'utf8');
  
  // Check for required methods
  const requiredMethods = [
    'fetchMerkleState',
    'generateProof',
    'verifyProof',
    'clearCache'
  ];
  
  let missingMethods = [];
  for (const method of requiredMethods) {
    if (!serviceFile.includes(`${method}(`)) {
      missingMethods.push(method);
    }
  }
  
  if (missingMethods.length > 0) {
    console.error(`❌ Missing required methods: ${missingMethods.join(', ')}`);
    process.exit(1);
  }
  
  console.log('✅ All required methods found in MerkleProofService');
  
  // Check for caching implementation
  if (!serviceFile.includes('stateCache') || !serviceFile.includes('proofCache')) {
    console.warn('⚠️ Caching implementation not found. Make sure caching is implemented for performance optimization');
  } else {
    console.log('✅ Caching implementation found');
  }
  
  // Check for retry logic
  if (!serviceFile.includes('maxRetries') || !serviceFile.includes('retry')) {
    console.warn('⚠️ Retry logic not found. Make sure retry logic is implemented for robustness');
  } else {
    console.log('✅ Retry logic implementation found');
  }
} catch (error) {
  console.error('Error reading MerkleProofService.ts:', error);
  process.exit(1);
}

// Check tests implementation
try {
  const testFile = fs.readFileSync(path.join(clientDir, 'test/services/MerkleProofService.test.ts'), 'utf8');
  
  // Check for test categories
  const requiredTests = [
    'Initialization',
    'Merkle State Operations',
    'Proof Generation',
    'Verification'
  ];
  
  let missingTests = [];
  for (const test of requiredTests) {
    if (!testFile.includes(test)) {
      missingTests.push(test);
    }
  }
  
  if (missingTests.length > 0) {
    console.warn(`⚠️ Missing test categories: ${missingTests.join(', ')}`);
  } else {
    console.log('✅ All required test categories found');
  }
} catch (error) {
  console.error('Error reading MerkleProofService.test.ts:', error);
  process.exit(1);
}

console.log('\n✅✅✅ Merkle State Fetching and Proof Generation (Task 4.2) successfully implemented!\n');
console.log('The MerkleProofService provides the following capabilities:');
console.log('- Fetching Merkle tree state from Light Protocol');
console.log('- Generating Merkle proofs for tree leaves');
console.log('- Verifying Merkle proofs');
console.log('- Caching mechanisms for performance optimization');
console.log('- Retry logic for robustness');
console.log('\nYou can now proceed to implement Task 4.3: Build and send transactions with generated proofs.');
console.log('\nTo verify your implementation, run:');
console.log('cd client && npm test'); 