/**
 * AI Health Check Validation Runner
 * Simple script to validate the health check prompt against test cases
 */

import { generateHealthCheckPrompt, PolicyTestData } from './health-check-prompt.ts';

interface HealthCheckResponse {
  health_score: number;
  overall_status: 'healthy' | 'warning' | 'critical';
  component_scores: {
    premium_payment: number;
    coverage_adequacy: number;
    compliance: number;
  };
  issues: Array<{
    type: string;
    severity: string;
    description: string;
    requires_remediation: boolean;
  }>;
  recommendations: Array<{
    action: string;
    priority: string;
    description: string;
  }>;
  ai_summary: string;
  confidence: number;
}

interface TestResult {
  test_id: string;
  passed: boolean;
  expected_status: string;
  actual_status: string;
  expected_score_range: [number, number];
  actual_score: number;
  expected_issues: string[];
  actual_issues: string[];
  confidence: number;
  ai_summary: string;
  failures: string[];
}

async function callGemini(prompt: string, apiKey: string): Promise<HealthCheckResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const text = result.candidates[0].content.parts[0].text;

  // With responseMimeType: "application/json", response should be pure JSON
  // But still handle potential markdown wrappers
  let jsonText = text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.substring(7); // Remove ```json
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.substring(3); // Remove ```
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.substring(0, jsonText.length - 3);
  }
  jsonText = jsonText.trim();

  return JSON.parse(jsonText);
}

function validateResult(
  testData: PolicyTestData,
  aiResponse: HealthCheckResponse
): TestResult {
  const failures: string[] = [];

  // Check 1: Status matches expected
  const statusMatch = aiResponse.overall_status === testData.expected_status;
  if (!statusMatch) {
    failures.push(`Status mismatch: expected "${testData.expected_status}", got "${aiResponse.overall_status}"`);
  }

  // Check 2: Score within expected range
  const [minScore, maxScore] = testData.expected_score_range;
  const scoreInRange = aiResponse.health_score >= minScore && aiResponse.health_score <= maxScore;
  if (!scoreInRange) {
    failures.push(`Score out of range: expected ${minScore}-${maxScore}, got ${aiResponse.health_score}`);
  }

  // Check 3: Expected issues are detected (if any)
  const detectedTypes = aiResponse.issues.map(i => i.type);
  const missingIssues = testData.expected_issues.filter(
    expectedType => !detectedTypes.includes(expectedType)
  );
  if (missingIssues.length > 0) {
    failures.push(`Missing expected issues: ${missingIssues.join(', ')}`);
  }

  // Check 4: Confidence threshold
  if (aiResponse.confidence < 0.70) {
    failures.push(`Low confidence: ${aiResponse.confidence.toFixed(2)} < 0.70`);
  }

  return {
    test_id: testData.test_id,
    passed: failures.length === 0,
    expected_status: testData.expected_status,
    actual_status: aiResponse.overall_status,
    expected_score_range: testData.expected_score_range,
    actual_score: aiResponse.health_score,
    expected_issues: testData.expected_issues,
    actual_issues: detectedTypes,
    confidence: aiResponse.confidence,
    ai_summary: aiResponse.ai_summary,
    failures
  };
}

function generateReport(
  results: TestResult[],
  fullPrompt: string,
  timestamp: string
): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const overallPass = passed >= 4; // Need 4/5 to pass

  let report = `# AI Health Check Prompt Validation Report\n`;
  report += `**Date:** ${timestamp}\n`;
  report += `**Model:** gemini-2.5-flash\n`;
  report += `**Temperature:** 0\n\n`;

  report += `## Summary\n`;
  report += `- Tests Run: ${results.length}\n`;
  report += `- Passed: ${passed}\n`;
  report += `- Failed: ${failed}\n`;
  report += `- Overall: ${overallPass ? '✅ PASS' : '❌ FAIL'} (${passed}/5 required 4/5)\n\n`;

  report += `## Results\n\n`;

  for (const result of results) {
    report += `### Test: ${result.test_id}\n`;
    report += `**Expected:** health_score ${result.expected_score_range[0]}-${result.expected_score_range[1]}, status "${result.expected_status}"\n`;
    report += `**Actual:** health_score ${result.actual_score}, status "${result.actual_status}"\n`;
    report += `**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n`;
    report += `**Result:** ${result.passed ? '✅ PASS' : '❌ FAIL'}\n\n`;

    if (!result.passed) {
      report += `**Failures:**\n`;
      for (const failure of result.failures) {
        report += `- ${failure}\n`;
      }
      report += `\n`;
    }

    report += `**AI Summary:** ${result.ai_summary}\n\n`;

    if (result.expected_issues.length > 0) {
      report += `**Expected Issues:** ${result.expected_issues.join(', ')}\n`;
    }
    if (result.actual_issues.length > 0) {
      report += `**Issues Detected:** ${result.actual_issues.join(', ')}\n`;
    } else {
      report += `**Issues Detected:** None\n`;
    }
    report += `\n---\n\n`;
  }

  report += `## Prompt Used\n\n`;
  report += `The following prompt template was used (shown with test-healthy data as example):\n\n`;
  report += `\`\`\`\n${fullPrompt}\n\`\`\`\n\n`;

  report += `## Recommendation\n\n`;
  if (overallPass) {
    report += `✅ **PROCEED TO SPRINT 3**\n\n`;
    report += `The AI health check prompt has been validated successfully. `;
    report += `${passed} out of 5 test cases passed all validation criteria:\n`;
    report += `- Status classification matches expected severity bucket\n`;
    report += `- Health scores fall within expected ranges\n`;
    report += `- Expected issues are correctly identified\n`;
    report += `- AI confidence exceeds 70% threshold\n\n`;
    report += `The prompt is ready for production implementation in Sprint 3.\n`;
  } else {
    report += `⚠️ **ITERATE ON PROMPT**\n\n`;
    report += `Only ${passed} out of 5 test cases passed. Review the failures above and consider:\n`;
    report += `- Adjusting scoring thresholds in the prompt\n`;
    report += `- Clarifying issue type definitions\n`;
    report += `- Adding more explicit examples for edge cases\n`;
    report += `- Reviewing the weighting of component scores\n\n`;
    report += `Re-run validation after prompt improvements.\n`;
  }

  return report;
}

async function main() {
  console.log('🚀 Starting AI Health Check Validation\n');

  // Get Gemini API key from environment
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY environment variable not set');
    Deno.exit(1);
  }

  // Load test policies
  console.log('📂 Loading test policies...');
  const testPoliciesText = await Deno.readTextFile('./tests/ai-validation/test-policies.json');
  const testPolicies: PolicyTestData[] = JSON.parse(testPoliciesText);
  console.log(`   Found ${testPolicies.length} test cases\n`);

  const results: TestResult[] = [];
  let samplePrompt = '';

  // Run each test
  for (let i = 0; i < testPolicies.length; i++) {
    const testData = testPolicies[i];
    console.log(`🧪 Test ${i + 1}/${testPolicies.length}: ${testData.test_id}`);

    try {
      // Generate prompt
      const prompt = generateHealthCheckPrompt(testData);
      if (i === 0) {
        samplePrompt = prompt; // Save first prompt for report
      }

      console.log('   📡 Calling Gemini API...');

      // Call AI
      const aiResponse = await callGemini(prompt, apiKey);

      console.log(`   📊 Score: ${aiResponse.health_score}, Status: ${aiResponse.overall_status}, Confidence: ${(aiResponse.confidence * 100).toFixed(1)}%`);

      // Validate
      const result = validateResult(testData, aiResponse);
      results.push(result);

      if (result.passed) {
        console.log(`   ✅ PASS\n`);
      } else {
        console.log(`   ❌ FAIL`);
        for (const failure of result.failures) {
          console.log(`      - ${failure}`);
        }
        console.log();
      }

      // Small delay to avoid rate limits
      if (i < testPolicies.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      results.push({
        test_id: testData.test_id,
        passed: false,
        expected_status: testData.expected_status,
        actual_status: 'error',
        expected_score_range: testData.expected_score_range,
        actual_score: 0,
        expected_issues: testData.expected_issues,
        actual_issues: [],
        confidence: 0,
        ai_summary: `Test failed with error: ${error.message}`,
        failures: [`API call failed: ${error.message}`]
      });
    }
  }

  // Generate report
  console.log('📝 Generating validation report...');
  const timestamp = new Date().toISOString();
  const report = generateReport(results, samplePrompt, timestamp);

  await Deno.writeTextFile('./tests/ai-validation/validation-report.md', report);
  console.log('   ✅ Report saved to: tests/ai-validation/validation-report.md\n');

  // Summary
  const passed = results.filter(r => r.passed).length;
  const overallPass = passed >= 4;

  console.log('📊 Final Summary:');
  console.log(`   Tests Passed: ${passed}/5`);
  console.log(`   Overall: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);

  if (!overallPass) {
    Deno.exit(1);
  }
}

// Run if this is the main module
if (import.meta.main) {
  main();
}
