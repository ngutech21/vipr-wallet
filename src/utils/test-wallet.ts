import {
  generateMnemonic,
  initialize,
  createWebWorkerTransport,
  setMnemonic,
  getMnemonic
} from '@fedimint/core-web'

const outputDiv = document.getElementById('output')

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  console.log(message)
  const className = type === 'success' ? 'success' : type === 'error' ? 'error' : ''
  outputDiv!.innerHTML += `<p class="${className}">${message}</p>`
}

async function testSDK() {
  try {
    log('🔄 Initializing Fedimint SDK with WebWorker transport...')

    // Initialize the SDK with the web worker transport
    await initialize(createWebWorkerTransport)

    log('✅ SDK initialized successfully!', 'success')

    // Test mnemonic generation
    log('🔄 Testing mnemonic generation...')
    const mnemonic = await generateMnemonic() as string[]
    log(`✅ Generated mnemonic: <code>${mnemonic.toString()}</code>`, 'success')

    // Test setting and getting mnemonic
    log('🔄 Testing mnemonic storage...')
    await setMnemonic(mnemonic)
    const retrievedMnemonic = await getMnemonic()

    if (retrievedMnemonic === mnemonic) {
      log('✅ Mnemonic storage working correctly', 'success')
    } else {
      log('❌ Mnemonic storage mismatch', 'error')
    }
    log('🎉 All tests completed!', 'success')

  } catch (error) {
    console.error('Error:', error)
    log(`❌ Error: ${error}`, 'error')

    // Log more details about the error
    if (error instanceof Error) {
      log(`Error message: ${error.message}`, 'error')
      if (error.stack) {
        console.error('Stack trace:', error.stack)
      }
    }
  }
}

// Add a button to re-run the test
const button = document.createElement('button')
button.textContent = 'Run Test Again'
button.style.cssText = 'margin-top: 20px; padding: 10px 20px; background: #4fc3f7; border: none; border-radius: 4px; color: white; cursor: pointer;'
button.onclick = async () => {
  outputDiv!.innerHTML = '<p>Starting test...</p>'
  await testSDK()
}
document.body.appendChild(button)

// Run the test on load
await testSDK()
