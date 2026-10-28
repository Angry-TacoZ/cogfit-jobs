import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('Svelte lint configuration', () => {
  it('checks JavaScript and Svelte template rules in component files', async () => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(
      '<script>let visible = true; missingFunction();</script>\n{#if visible}A{:else if visible}B{/if}',
      { filePath: 'src/LintFixture.svelte' }
    );

    const ruleIds = result.messages.map((message) => message.ruleId);
    expect(ruleIds).toContain('no-undef');
    expect(ruleIds).toContain('svelte/no-dupe-else-if-blocks');
  });
});
