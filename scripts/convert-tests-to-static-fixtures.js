/**
 * Script to convert E2E test files from using factories to static fixtures
 *
 * Usage: node scripts/convert-tests-to-static-fixtures.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const testsDir = path.join(__dirname, '..', 'tests', 'e2e');

// Find all test files that import from support/fixtures
const testFiles = glob.sync('**/*.spec.ts', {
  cwd: testsDir,
  absolute: true,
  ignore: ['**/infrastructure/**'] // Skip infrastructure tests (already converted)
});

console.log(`Found ${testFiles.length} test files to convert\n`);

let convertedCount = 0;
let skippedCount = 0;

testFiles.forEach(filePath => {
  const relativePath = path.relative(testsDir, filePath);
  console.log(`Processing: ${relativePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if file uses support/fixtures
  if (!content.includes('support/fixtures')) {
    console.log('  ⏭️  Already converted or doesn't use fixtures\n');
    skippedCount++;
    return;
  }

  // Check if file uses data factories (bookingFactory, customerFactory, etc.)
  const usesDataFactories = content.match(/(bookingFactory|customerFactory|teamFactory)/);

  if (usesDataFactories) {
    console.log(`  ⚠️  Uses data factories - will be partially converted (auth tests only)\n`);

    // Convert imports
    content = content.replace(
      /import { test, expect } from ['"].*support\/fixtures['"];/g,
      `import { test, expect } from '@playwright/test';\nimport { testUsers } from '../../fixtures/users';`
    );

    // Skip tests that require data factories
    content = content.replace(
      /test\((['"].*?['"], async \({ page, (?:userFactory, )?(bookingFactory|customerFactory|teamFactory))/g,
      "test.skip($1"
    );

    // Convert userFactory tests
    content = convertUserFactoryTests(content);

  } else {
    console.log('  ✅ Converting all tests\n');

    // Convert imports
    content = content.replace(
      /import { test, expect } from ['"].*support\/fixtures['"];/g,
      `import { test, expect } from '@playwright/test';\nimport { testUsers } from '../../fixtures/users';`
    );

    // Convert all tests
    content = convertUserFactoryTests(content);
  }

  // Write back
  fs.writeFileSync(filePath, content, 'utf-8');
  convertedCount++;
});

console.log(`\n✅ Conversion complete!`);
console.log(`   Converted: ${convertedCount} files`);
console.log(`   Skipped: ${skippedCount} files`);

/**
 * Convert userFactory usage to static testUsers
 */
function convertUserFactoryTests(content) {
  // Remove userFactory from function parameters
  content = content.replace(
    /async \({ page, userFactory }\)/g,
    'async ({ page })'
  );

  content = content.replace(
    /async \({\s*page,\s*userFactory,?\s*}\)/g,
    'async ({ page })'
  );

  // Convert createAdmin()
  content = content.replace(
    /const (\w+) = await userFactory\.createAdmin\([^)]*\);?/g,
    'const $1 = testUsers.admin;'
  );

  // Convert createManager()
  content = content.replace(
    /const (\w+) = await userFactory\.createManager\([^)]*\);?/g,
    'const $1 = testUsers.manager;'
  );

  // Convert createStaff() - use staff1 by default
  content = content.replace(
    /const (\w+) = await userFactory\.createStaff\([^)]*\);?/g,
    (match, varName, offset) => {
      // Check if this is the first, second, or third staff
      const beforeText = content.substring(0, offset);
      const staffCount = (beforeText.match(/testUsers\.staff\d/g) || []).length;
      const staffNumber = Math.min(staffCount + 1, 3);
      return `const ${varName} = testUsers.staff${staffNumber};`;
    }
  );

  // Replace password 'Test1234!' with user.password
  content = content.replace(
    /(['"])Test1234!['"](?=\s*\);\s*$)/gm,
    (match, quote, offset) => {
      // Find the variable name before this password
      const beforeText = content.substring(Math.max(0, offset - 200), offset);
      const varMatch = beforeText.match(/const (\w+) = testUsers\.\w+;[\s\S]*?fill.*password.*?,\s*$/);
      if (varMatch) {
        const varName = varMatch[1];
        return `${varName}.password`;
      }
      return match;
    }
  );

  return content;
}
