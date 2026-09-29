const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '..', 'apps_script', 'Code.js');
const indexPath = path.join(__dirname, '..', 'apps_script', 'Index.html');
const singleFilePath = path.join(__dirname, '..', 'apps_script', 'SingleFile_Code.js');

const codeContent = fs.readFileSync(codePath, 'utf8');
const htmlContent = fs.readFileSync(indexPath, 'utf8');

// The single-file build inlines Index.html directly instead of loading it as a
// separate HTML file, so the whole app can be pasted into one Code.gs.
const singleFileDoGet = `function doGet() {
  return HtmlService.createHtmlOutput(getHtmlDashboard())
    .setTitle('CycleSync')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getHtmlDashboard() {
  return ${JSON.stringify(htmlContent)};
}
`;

// Replace the doGet() function block (from "function doGet()" up to the first
// line that is a lone closing brace) with the inlined single-file version.
const doGetPattern = /function doGet\(\)\s*\{[\s\S]*?\n\}\n/;
if (!doGetPattern.test(codeContent)) {
  console.error('ERROR: could not locate function doGet() in Code.js — SingleFile_Code.js not regenerated.');
  process.exit(1);
}

const newCode = codeContent.replace(doGetPattern, singleFileDoGet);
fs.writeFileSync(singleFilePath, newCode, 'utf8');
console.log('SingleFile_Code.js generated successfully!');
