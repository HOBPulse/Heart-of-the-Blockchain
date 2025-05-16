#!/bin/bash

# Cleaning script for Heart of Blockchain hackathon submission
echo "🧹 Cleaning repository for submission..."

# Make sure we're in the right directory
if [ ! -d "client" ] || [ ! -d "docs" ] || [ ! -d "ZK-STACK" ]; then
  echo "❌ Error: Run this script from the root of the Heart of Blockchain repository"
  exit 1
fi

# Clean build artifacts (even if gitignored, just to be safe)
echo "🗑️  Removing build artifacts..."
find . -name "node_modules" -type d -exec rm -rf {} +
find . -name "target" -type d -exec rm -rf {} +
find . -name "dist" -type d -exec rm -rf {} +
find . -name "build" -type d -exec rm -rf {} +
find ZK-STACK/tests -type f -not -name "*.rs" -not -name "README.md" -exec rm -f {} \;

# Make sure README.md exists
if [ ! -f "README.md" ]; then
  echo "❌ Error: README.md is missing! This is required for the submission."
  exit 1
fi

echo "🔍 Adding only necessary files/directories..."

# Add README and key config files
git add README.md .gitignore heart_of_blockchain.code-workspace

# Add only the specified directories, respecting .gitignore
git add client/
git add docs/
git add external/
git add programs/
git add tests/
git add ZK-STACK/

# Show what will be committed
echo "✅ Ready for review. The following files will be included:"
git status

echo "
📝 Next steps:
1. Review the files above to ensure only necessary files are included
2. Run: git commit -m 'Prepare Heart of Blockchain for hackathon submission'
3. Run: git push origin main

❗ If this looks correct, proceed with the commands above.
❗ If not, modify .gitignore and run this script again." 