import debug from 'debug';
import { template } from 'es-toolkit/compat';

import { BaseProcessor } from '../base/BaseProcessor';
import type { PipelineContext, ProcessorOptions } from '../types';

const log = debug('context-engine:processor:InputTemplateProcessor');

export interface InputTemplateConfig {
  /** Input message template string */
  inputTemplate?: string;
}

/**
 * Input Template Processor
 * Responsible for applying input message templates to user messages
 */
export class InputTemplateProcessor extends BaseProcessor {
  readonly name = 'InputTemplateProcessor';

  constructor(
    private config: InputTemplateConfig,
    options: ProcessorOptions = {},
  ) {
    super(options);
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    const clonedContext = this.cloneContext(context);

    // Skip processing if no template is configured
    if (!this.config.inputTemplate) {
      log('No input template configured, skipping processing');
      return this.markAsExecuted(clonedContext);
    }

    let processedCount = 0;

    try {
      // Compile the template
      const compiler = template(this.config.inputTemplate, {
        interpolate: /{{\s*(text)\s*}}/g,
      });

      log(`Applying input template: ${this.config.inputTemplate}`);

      // Apply template ONLY to the last user message
      // Avoid mutating historical user messages because it changes the original context.
      let lastUserIndex = -1;
      for (let i = clonedContext.messages.length - 1; i >= 0; i--) {
        if (clonedContext.messages[i]?.role === 'user') {
          lastUserIndex = i;
          break;
        }
      }

      if (lastUserIndex >= 0) {
        const message = clonedContext.messages[lastUserIndex];

        // Only apply template to string content
        // Some models / pipelines may include multimodal content arrays.
        if (typeof message.content !== 'string') {
          log(`Skip input template for non-string content message ${message.id}`);
        } else {
          try {
            const originalContent = message.content;
            const processedContent = compiler({ text: originalContent });

            if (processedContent !== originalContent) {
              clonedContext.messages[lastUserIndex] = {
                ...message,
                content: processedContent,
              };
              processedCount++;
              log(`Applied template to last user message ${message.id}`);
            }
          } catch (error) {
            log.extend('error')(`Error applying template to message ${message.id}: ${error}`);
            // Keep original message on error
          }
        }
      }
    } catch (error) {
      log.extend('error')(`Template compilation failed: ${error}`);
      // Skip processing if template compilation fails
    }

    // Update metadata
    clonedContext.metadata.inputTemplateProcessed = processedCount;

    log(`Input template processing completed, processed ${processedCount} messages`);

    return this.markAsExecuted(clonedContext);
  }
}
