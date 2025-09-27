// Test script for 0G Compute integration
const axios = require('axios');

async function testZGComputeAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing 0G Compute Network Integration\n');

  try {
    // Test 1: List available services
    console.log('1️⃣ Testing service listing...');
    const servicesResponse = await axios.get(`${baseUrl}/api/0g-compute/services`);
    
    if (servicesResponse.data.success) {
      console.log(`✅ Found ${servicesResponse.data.count} available AI services:`);
      servicesResponse.data.services.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name} (${service.model})`);
        console.log(`      Provider: ${service.provider.slice(0, 8)}...`);
        console.log(`      Type: ${service.serviceType}`);
        console.log(`      Input Price: ${service.inputPrice}`);
        console.log(`      Output Price: ${service.outputPrice}`);
        console.log('');
      });
    } else {
      console.log('❌ Failed to list services:', servicesResponse.data.error);
    }

    console.log('---\n');

    // Test 2: Simple inference
    console.log('2️⃣ Testing model inference...');
    const inferenceResponse = await axios.post(`${baseUrl}/api/0g-compute`, {
      input_text: 'What is the capital of France?',
      max_tokens: 100,
      temperature: 0.7
    });

    if (inferenceResponse.data.success) {
      console.log('✅ Inference completed successfully!');
      console.log(`   Input: "${inferenceResponse.data.input_text}"`);
      console.log(`   Output: "${inferenceResponse.data.output}"`);
      console.log(`   Model: ${inferenceResponse.data.model}`);
      console.log(`   Provider: ${inferenceResponse.data.provider.slice(0, 8)}...`);
      console.log(`   Verified: ${inferenceResponse.data.verified}`);
      
      if (inferenceResponse.data.usage) {
        console.log(`   Token Usage:`);
        console.log(`     Input: ${inferenceResponse.data.usage.input_tokens}`);
        console.log(`     Output: ${inferenceResponse.data.usage.output_tokens}`);
        console.log(`     Total: ${inferenceResponse.data.usage.total_tokens}`);
      }
    } else {
      console.log('❌ Inference failed:', inferenceResponse.data.error);
      console.log('   Details:', inferenceResponse.data.details);
    }

    console.log('---\n');

    // Test 3: Complex inference
    console.log('3️⃣ Testing complex inference...');
    const complexResponse = await axios.post(`${baseUrl}/api/0g-compute`, {
      input_text: 'Explain quantum computing in simple terms and provide a practical example.',
      max_tokens: 200,
      temperature: 0.5
    });

    if (complexResponse.data.success) {
      console.log('✅ Complex inference completed successfully!');
      console.log(`   Output length: ${complexResponse.data.output.length} characters`);
      console.log(`   Output preview: "${complexResponse.data.output.slice(0, 100)}..."`);
      console.log(`   Model: ${complexResponse.data.model}`);
      console.log(`   Verified: ${complexResponse.data.verified}`);
    } else {
      console.log('❌ Complex inference failed:', complexResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n🏁 Test completed!');
}

// Run the test
testZGComputeAPI().catch(console.error);
