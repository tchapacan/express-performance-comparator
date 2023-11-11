const { execSync } = require('child_process');

const compare = (a, b) => {
    return execSync(`git diff --no-index --word-diff=porcelain ${a} ${b}`).toString();
}

const getReport = (version, name) => {
    console.log(`Installing express@${version}...`);
    execSync(`npm i express@${version}`);
    console.log(`Running analysis...`);
    execSync(`make > ${name}.txt`);
}

const cleanUp = () => {
    console.log(`Cleaning up...`);
    execSync('npm uninstall express');
    console.log(`Removing package-lock.json and node_modules...`);
    execSync('rm -rf package-lock.json node_modules');
}

// Get arguments from CLI
const args = process.argv.slice(2);
const [previous, current] = args;
console.log(`Comparing ${previous} with ${current}...`);
getReport(previous, 'previous');
getReport(current, 'current');
cleanUp();
console.log('You can now compare previous.txt with current.txt');
