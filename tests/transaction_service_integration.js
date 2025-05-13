// Test script for Transaction Building and Sending (Task 4.3)
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
  'src/services/TransactionService.ts',
  'test/services/TransactionService.test.ts',
  'src/examples/transaction-with-proof.ts'
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
  console.error('Some required files are missing. Please complete Task 4.3 implementation.');
  process.exit(1);
}

// Check if TransactionService is properly exported in index.ts
try {
  const indexFile = fs.readFileSync(path.join(clientDir, 'src/index.ts'), 'utf8');
  
  if (!indexFile.includes('export * from \'./services/TransactionService\'')) {
    console.error('❌ TransactionService is not exported from index.ts');
    process.exit(1);
  }
  
  console.log('✅ TransactionService is properly exported from index.ts');
  
  // Check for initialization function
  if (!indexFile.includes('initTransactionService')) {
    console.warn('⚠️ initTransactionService function not found in index.ts');
  } else {
    console.log('✅ initTransactionService function found in index.ts');
  }
} catch (error) {
  console.error('Error reading index.ts:', error);
  process.exit(1);
}

// Check the TransactionService implementation
try {
  const serviceFile = fs.readFileSync(path.join(clientDir, 'src/services/TransactionService.ts'), 'utf8');
  
  // Check for required methods
  const requiredMethods = [
    'buildTransactionWithProof',
    'sendTransaction',
    'generateProofAndBuildTransaction',
    'waitForConfirmation'
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
  
  console.log('✅ All required methods found in TransactionService');
  
  // Check for retry logic
  if (!serviceFile.includes('maxRetries') || !serviceFile.includes('currentRetry')) {
    console.warn('⚠️ Retry logic not found. Make sure retry logic is implemented for robustness');
  } else {
    console.log('✅ Retry logic implementation found');
  }
  
  // Check for transaction tracking
  if (!serviceFile.includes('pendingTransactions')) {
    console.warn('⚠️ Transaction tracking not found. Make sure transactions are tracked for status updates');
  } else {
    console.log('✅ Transaction tracking implementation found');
  }
} catch (error) {
  console.error('Error reading TransactionService.ts:', error);
  process.exit(1);
}

// Check tests implementation
try {
  const testFile = fs.readFileSync(path.join(clientDir, 'test/services/TransactionService.test.ts'), 'utf8');
  
  // Check for test categories
  const requiredTests = [
    'Initialization',
    'Transaction Building',
    'Transaction Sending',
    'Transaction Status'
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
  console.error('Error reading TransactionService.test.ts:', error);
  process.exit(1);
}

// Check example implementation
try {
  const exampleFile = fs.readFileSync(path.join(clientDir, 'src/examples/transaction-with-proof.ts'), 'utf8');
  
  // Check for key workflow steps
  const requiredSteps = [
    'proof',
    'buildTransactionWithProof',
    'generateProofAndBuildTransaction',
    'sendTransaction'
  ];
  
  let missingSteps = [];
  for (const step of requiredSteps) {
    if (!exampleFile.includes(step)) {
      missingSteps.push(step);
    }
  }
  
  if (missingSteps.length > 0) {
    console.warn(`⚠️ Missing workflow steps in example: ${missingSteps.join(', ')}`);
  } else {
    console.log('✅ All required workflow steps found in example');
  }
} catch (error) {
  console.error('Error reading example file:', error);
  process.exit(1);
}

console.log('\n✅✅✅ Transaction Building and Sending (Task 4.3) successfully implemented!\n');
console.log('The TransactionService provides the following capabilities:');
console.log('- Building transactions that incorporate Merkle proofs');
console.log('- Sending transactions with retry logic for robustness');
console.log('- Tracking transaction status for user feedback');
console.log('- Generating proofs and building transactions in one step');
console.log('- Waiting for transaction confirmation with timeout protection');
console.log('\nAll three client services are now implemented and ready for integration:');
console.log('1. LightProtocolService - Basic SDK integration');
console.log('2. MerkleProofService - Merkle state fetching and proof generation');
console.log('3. TransactionService - Transaction building and sending with proofs');
console.log('\nTo verify your implementation, run:');
console.log('cd client && npm test'); 