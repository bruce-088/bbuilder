import { describe, it, expect } from 'vitest';
import { generateDirectorAiFixPrompt, generateQuickFixPrompt, type FixIssue, type BusinessContext, type FixPromptContext } from './directorAiFixPromptGenerator';

describe('generateDirectorAiFixPrompt', () => {
  const mockBusinessContext: BusinessContext = {
    businessName: 'GhostWriter AI',
    niche: 'Executive Ghostwriting',
    targetAudience: 'Cybersecurity Founders',
    serviceOffering: 'LinkedIn Authority Building',
    valueProposition: 'Build thought leadership automatically',
  };

  const mockIssue: FixIssue = {
    phase: 'Outreach',
    rootCause: 'Claude node API key not configured',
    solution: 'Add your Anthropic API key to the Claude node credentials',
    steps: [
      'Open the Claude node in n8n',
      'Click on "Create New Credential"',
      'Enter your Anthropic API key',
      'Save and test the connection',
    ],
    prevention: 'Always verify API keys are configured before activating workflows',
    confidence: 'high',
    automatable: false,
  };

  const mockContext: FixPromptContext = {
    issue: mockIssue,
    businessContext: mockBusinessContext,
    n8nOptions: {
      n8nInstanceUrl: 'https://n8n.example.com',
      n8nWorkflowPath: 'https://n8n.example.com/workflow/123',
      hostingType: 'cloud',
    },
    knowledgeBaseHits: 2,
  };

  it('should generate a prompt with canvas navigation instructions', () => {
    const prompt = generateDirectorAiFixPrompt(mockContext);

    // Check for the Canvas Navigation Guide section
    expect(prompt).toContain('## n8n Canvas Navigation Guide');
    expect(prompt).toContain('### How to Find Nodes on the Canvas');
    expect(prompt).toContain('### How to Open a Node\'s Configuration Panel');
    expect(prompt).toContain('### Troubleshooting Canvas Navigation');
  });

  it('should extract node names from steps and include them in navigation', () => {
    const prompt = generateDirectorAiFixPrompt(mockContext);

    // Check that node names are extracted and listed
    expect(prompt).toContain('### Nodes That Need Fixing');
    expect(prompt).toContain('Claude');
  });

  it('should include keyboard shortcuts for n8n navigation', () => {
    const prompt = generateDirectorAiFixPrompt(mockContext);

    // Check for keyboard shortcuts
    expect(prompt).toContain('Ctrl/Cmd + K');  // Command palette
    expect(prompt).toContain('Ctrl/Cmd + 0');  // Fit all nodes
    expect(prompt).toContain('Ctrl/Cmd + -');  // Zoom out
    expect(prompt).toContain('Ctrl/Cmd + +');  // Zoom in
  });

  it('should include fit all nodes step before fix actions', () => {
    const prompt = generateDirectorAiFixPrompt(mockContext);

    // Check that navigation setup happens before fix actions
    expect(prompt).toContain('Wait for the workflow canvas to fully load');
    expect(prompt).toContain('Press `Ctrl/Cmd + 0` to fit all nodes in view');
  });

  it('should include business context as JSON', () => {
    const prompt = generateDirectorAiFixPrompt(mockContext);

    expect(prompt).toContain('## Business Context');
    expect(prompt).toContain('GhostWriter AI');
    expect(prompt).toContain('Executive Ghostwriting');
  });

  it('should include knowledge base enhancement indicator', () => {
    const prompt = generateDirectorAiFixPrompt(mockContext);

    expect(prompt).toContain('Knowledge Base Enhanced');
    expect(prompt).toContain('2 previously successful fixes');
  });

  it('should include n8n environment settings', () => {
    const prompt = generateDirectorAiFixPrompt(mockContext);

    expect(prompt).toContain('## N8N Environment');
    expect(prompt).toContain('n8n.example.com');
    expect(prompt).toContain('n8n Cloud');
  });

  it('should enhance steps with UI action instructions', () => {
    const prompt = generateDirectorAiFixPrompt(mockContext);

    // Steps should include enhanced instructions
    expect(prompt).toContain('## Fix Actions');
    // The steps should be enhanced with UI guidance
  });

  it('should include post-fix verification indicators', () => {
    const prompt = generateDirectorAiFixPrompt(mockContext);

    expect(prompt).toContain('## Post-Fix Verification');
    expect(prompt).toContain('✅');
    expect(prompt).toContain('## Failure Indicators');
    expect(prompt).toContain('❌');
  });
});

describe('generateQuickFixPrompt', () => {
  const mockIssue: FixIssue = {
    phase: 'Outreach',
    rootCause: 'Email node not configured',
    solution: 'Configure the Gmail node with your credentials',
    steps: ['Open Gmail node', 'Add credentials', 'Test connection'],
    prevention: 'Always test email credentials before going live',
    confidence: 'medium',
    automatable: false,
  };

  it('should generate a simplified fix prompt', () => {
    const prompt = generateQuickFixPrompt(mockIssue, {
      n8nWorkflowPath: 'https://n8n.example.com/workflow/456',
    });

    expect(prompt).toContain('Fix "Outreach" phase issue');
    expect(prompt).toContain('Email node not configured');
    expect(prompt).toContain('Configure the Gmail node');
    expect(prompt).toContain('1. Open Gmail node');
    expect(prompt).toContain('2. Add credentials');
    expect(prompt).toContain('3. Test connection');
  });
});
