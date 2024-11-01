const {execSync, spawn} = require('child_process')
const fs = require('fs')

const runCommand = command => execSync(command, {encoding: 'utf8'}).trim()

const startServer = (middleware, useLocalExpress) => {
  console.log(`Starting server with ${middleware} middleware layers...`)
  const server = spawn('node', ['middleware.js'], {
    env: {
      ...process.env,
      MW: middleware,
      USE_LOCAL_EXPRESS: useLocalExpress ? 'true' : ''
    },
    stdio: 'inherit'
  })

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        execSync('curl -s http://127.0.0.1:3333')
        resolve(server)
      } catch (error) {
        server.kill()
        reject(new Error('Server failed to start.'))
      }
    }, 3000)
  })
}

const runLoadTest = (url, connectionsList) => {
  return connectionsList.map(connections => {
    try {
      const output = runCommand(`wrk ${url} -d 3 -c ${connections} -t 8`)
      const reqSec = output.match(/Requests\/sec:\s+(\d+.\d+)/)?.[1]
      const latency = output.match(/Latency\s+(\d+.\d+)/)?.[1]
      return {connections, reqSec, latency}
    } catch (error) {
      console.error(
        `Error running load test for ${connections} connections:`,
        error.message
      )
      return {connections, reqSec: 'N/A', latency: 'N/A'} // Return N/A for failed tests
    }
  })
}

const generateMarkdownTable = results => {
  const headers = `| Connections | Requests/sec | Latency |\n|-------------|--------------|---------|`
  const rows = results
    .map(
      r => `| ${r.connections} | ${r.reqSec || 'N/A'} | ${r.latency || 'N/A'} |`
    )
    .join('\n')
  return `${headers}\n${rows}`
}

const cleanUp = () => {
  console.log('Cleaning up...')
  runCommand('npm uninstall express')
  runCommand('rm -rf package-lock.json node_modules')
}

const runTests = async ({
  identifier,
  connectionsList,
  middlewareCounts,
  outputFile,
  useLocalExpress,
  isVersionTest = false
}) => {
  if (isVersionTest) {
    runCommand(`npm install express@${identifier}`)
  } else {
    runCommand(`git checkout ${identifier}`)
    runCommand('npm install')
  }

  const resultsMarkdown = [
    `\n\n# Load Test Results for ${isVersionTest ? `Express v${identifier}` : `Branch ${identifier}`}`
  ]

  for (const middlewareCount of middlewareCounts) {
    try {
      const server = await startServer(middlewareCount, useLocalExpress)
      const results = runLoadTest(
        'http://127.0.0.1:3333/?foo[bar]=baz',
        connectionsList
      )
      server.kill()
      resultsMarkdown.push(
        `### Load test for ${middlewareCount} middleware layers\n\n${generateMarkdownTable(results)}`
      )
    } catch (error) {
      console.error('Error in load test process:', error)
    }
  }

  fs.writeFileSync(outputFile, resultsMarkdown.join('\n\n'))
  cleanUp()
}

const compareBranches = async ({
  prevBranch,
  currBranch,
  connectionsList,
  middlewareCounts,
  useLocalExpress
}) => {
  console.log(`Comparing branches: ${prevBranch} vs ${currBranch}`)
  await runTests({
    identifier: prevBranch,
    connectionsList,
    middlewareCounts,
    outputFile: `results_${prevBranch}.md`,
    useLocalExpress
  })
  await runTests({
    identifier: currBranch,
    connectionsList,
    middlewareCounts,
    outputFile: `results_${currBranch}.md`,
    useLocalExpress
  })
}

const compareVersions = async ({
  prevVersion,
  currVersion,
  connectionsList,
  middlewareCounts,
  useLocalExpress
}) => {
  console.log(
    `Comparing versions: Express v${prevVersion} vs Express v${currVersion}`
  )
  await runTests({
    identifier: prevVersion,
    connectionsList,
    middlewareCounts,
    outputFile: `results_${prevVersion}.md`,
    useLocalExpress,
    isVersionTest: true
  })
  await runTests({
    identifier: currVersion,
    connectionsList,
    middlewareCounts,
    outputFile: `results_${currVersion}.md`,
    useLocalExpress,
    isVersionTest: true
  })
}

const compareBranchAndVersion = async ({
  branch,
  version,
  connectionsList,
  middlewareCounts,
  useLocalExpress
}) => {
  console.log(`Comparing branch ${branch} with Express version ${version}`)
  await runTests({
    identifier: branch,
    connectionsList,
    middlewareCounts,
    outputFile: `results_${branch}.md`,
    useLocalExpress
  })
  await runTests({
    identifier: version,
    connectionsList,
    middlewareCounts,
    outputFile: `results_${version}.md`,
    useLocalExpress,
    isVersionTest: true
  })
}

const main = async () => {
  const connectionsList = [50, 100, 250, 500, 1000]
  const middlewareCounts = [1, 5, 10, 15, 20, 30, 50, 100]
  const prevBranch = process.env.PREV_BRANCH
  const currBranch = process.env.CURR_BRANCH
  const prevVersion = process.env.PREV_VERSION
  const currVersion = process.env.CURR_VERSION
  const version = process.env.VERSION
  const branch = process.env.BRANCH

  const useLocalExpress = !!(currBranch || prevBranch || branch)

  if (prevBranch && currBranch) {
    await compareBranches({
      prevBranch,
      currBranch,
      connectionsList,
      middlewareCounts,
      useLocalExpress
    })
    return
  }

  if (prevVersion && currVersion) {
    await compareVersions({
      prevVersion,
      currVersion,
      connectionsList,
      middlewareCounts,
      useLocalExpress
    })
    return
  }

  if (branch && version) {
    await compareBranchAndVersion({
      branch,
      version,
      connectionsList,
      middlewareCounts,
      useLocalExpress
    })
    return
  }

  console.error(
    'Invalid input combination. Provide either two branches, two versions, or one branch and one version.'
  )
  process.exit(1)
}

main()
