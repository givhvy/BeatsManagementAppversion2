import Anthropic from '@anthropic-ai/sdk';
import path from 'path';

class AIMetadataGenerator {
  constructor(config) {
    this.config = config;
    this.provider = config.aiProvider;

    if (this.provider === 'claude' && config.aiSettings.claudeApiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.aiSettings.claudeApiKey,
      });
    }
  }

  async generateMetadata(fileName, filePath, metadataTemplate = null) {
    const fileNameWithoutExt = path.parse(fileName).name;

    try {
      if (this.provider === 'claude' && this.anthropic) {
        return await this.generateWithClaude(fileNameWithoutExt, metadataTemplate);
      } else {
        // Fallback: tạo metadata từ tên file
        return this.generateFromFileName(fileNameWithoutExt, metadataTemplate);
      }
    } catch (error) {
      console.error('⚠️  Lỗi AI, dùng metadata mặc định:', error.message);
      return this.generateFromFileName(fileNameWithoutExt, metadataTemplate);
    }
  }

  async generateWithClaude(fileName) {
    const prompt = `Bạn là chuyên gia YouTube SEO cho kênh nhạc beats. Dựa vào tên file: "${fileName}"

Hãy tạo:
1. Title: Tiêu đề hấp dẫn, SEO-friendly (dưới 100 ký tự)
2. Description: Mô tả chi tiết về beat này (3-5 câu)
3. Tags: 10-15 tags liên quan

Trả về JSON format:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...]
}`;

    const message = await this.anthropic.messages.create({
      model: this.config.aiSettings.model || 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const response = message.content[0].text;
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return this.generateFromFileName(fileName);
  }

  async generateWithOllama(fileName) {
    try {
      const prompt = `You are a YouTube SEO expert for beat producers. Analyze this beat filename: "${fileName}"

Create metadata following this exact format:

TITLE FORMAT:
- If contains "rnb" or "r&b": (FREE) R&B Acoustic Guitar Type Beat | "[main theme/name]"
- If contains "trap": (FREE) Trap Type Beat | "[main theme/name]"
- If contains "drill": (FREE) Drill Type Beat | "[main theme/name]"
- Otherwise: (FREE) [Genre] Type Beat | "[main theme/name]"

Example: "morning rnb" → "(FREE) R&B Acoustic Guitar Type Beat | \"morning\""

DESCRIPTION (if R&B beat):
💰PURCHASE on instagram @sheloveslvmh

• You must credit with (PROD. LVMH) in the title
• You must purchase a lease to upload your track to streaming platforms like Spotify, Apple Music, etc.
• Don't put a copyright on your song unless you purchased exclusive rights. Otherwise, it will be hit with a complaint.

Prices:
$15 - mp3 lease
$25 - wav lease
$35 - full stems
$45 - unlimited
negotiate price - exclusive

💰PURCHASE will have no tag on instagram @sheloveslvmh

This beat is free for NON PROFIT USE ONLY (writing lyrics, test recording with beat, no upload on streaming platforms)

TAGS (R&B beat): rnb type beat, rnb type beat free, free rnb type beat, type beat, trap soul type beat, rnb beats, smooth rnb type beat, r&b type beat, rnb instrumental, r&b type beat, guitar rnb type beat, summer walker type beat, trapsoul type beat, type beat rnb, bryson tiller type beat, free trapsoul type beat, guitar r&b type beat, free r&b type beat, free trap soul type beat, trapsoul beat, summer walker type beat free, tory lanez r&b type beat, rnb, r&b drake type beat, drake type beat, free summer walker type beats, free bryson tiller type beat, smooth type beat, melodic type beat, rnb beat, rap beats, beats, rap type beat, beat, type beats, rap, smooth r&b instrumental, free r&b type beat, brent faiyaz type beat, beat rap, hip hop beats, freestyle beats, hip hop type beat, freestyle type beat, freestyle beat, hip hop beat, r&b beats, smooth r&b

Return JSON only:
{"title": "...", "description": "...", "tags": ["tag1", "tag2", ...]}`;

      const response = await fetch(`${this.config.aiSettings.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.aiSettings.model || 'llama3.2',
          prompt: prompt,
          stream: false,
        }),
      });

      const data = await response.json();
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this.generateFromFileName(fileName);
    } catch (error) {
      console.error('⚠️  Ollama không khả dụng:', error.message);
      return this.generateFromFileName(fileName);
    }
  }

  generateFromFileName(fileName, metadataTemplate = null) {
    const cleanName = fileName
      .replace(/[_-]/g, ' ')
      .toLowerCase();

    // Detect genre from filename
    const isRnB = cleanName.includes('rnb') || cleanName.includes('r&b') || cleanName.includes('r and b');
    const isTrap = cleanName.includes('trap');
    const isDrill = cleanName.includes('drill');
    const isBoomBap = cleanName.includes('boom bap') || cleanName.includes('boombap');

    // Extract main theme (remove genre keywords)
    let theme = cleanName
      .replace(/rnb|r&b|r and b|trap|drill|boom bap|boombap|type beat|beat/gi, '')
      .trim();

    if (!theme) theme = cleanName;

    // Generate title based on template or genre
    let title;
    if (metadataTemplate && metadataTemplate.titleTemplate) {
      // Smart capitalization based on "Beat" word in template
      const beatMatch = metadataTemplate.titleTemplate.match(/\b(Beat|beat|BEAT)\b/);

      if (beatMatch) {
        const beatWord = beatMatch[1];

        if (beatWord === 'BEAT') {
          // All caps - make theme all caps
          theme = theme.toUpperCase();
        } else if (beatWord === 'Beat') {
          // Title case - capitalize first letter of each word
          theme = theme.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        } else {
          // lowercase - keep theme lowercase
          theme = theme.toLowerCase();
        }
      } else {
        // Default: capitalize first letter
        theme = theme.charAt(0).toUpperCase() + theme.slice(1);
      }

      // Replace [Name] placeholder with theme
      title = metadataTemplate.titleTemplate.replace(/\[Name\]/g, theme);
    } else if (metadataTemplate && (metadataTemplate.titlePrefix || metadataTemplate.titleSuffix)) {
      // Old format support
      theme = theme.charAt(0).toUpperCase() + theme.slice(1);
      const prefix = metadataTemplate.titlePrefix || '';
      const suffix = metadataTemplate.titleSuffix || '';
      title = `${prefix}${theme} ${suffix}`.trim();
    } else if (isRnB) {
      theme = theme.charAt(0).toUpperCase() + theme.slice(1);
      title = `(FREE) R&B Acoustic Guitar Type Beat | "${theme}"`;
    } else if (isTrap) {
      theme = theme.charAt(0).toUpperCase() + theme.slice(1);
      title = `(FREE) Trap Type Beat | "${theme}"`;
    } else if (isDrill) {
      theme = theme.charAt(0).toUpperCase() + theme.slice(1);
      title = `(FREE) Drill Type Beat | "${theme}"`;
    } else {
      theme = theme.charAt(0).toUpperCase() + theme.slice(1);
      title = `(FREE) Type Beat | "${theme}"`;
    }

    // R&B specific description and tags
    const rnbDescription = `💰PURCHASE on instagram @sheloveslvmh

• You must credit with (PROD. LVMH) in the title
• You must purchase a lease to upload your track to streaming platforms like Spotify, Apple Music, etc.
• Don't put a copyright on your song unless you purchased exclusive rights. Otherwise, it will be hit with a complaint.

Prices:
$15 - mp3 lease
$25 - wav lease
$35 - full stems
$45 - unlimited
negotiate price - exclusive

💰PURCHASE will have no tag on instagram @sheloveslvmh

This beat is free for NON PROFIT USE ONLY (writing lyrics, test recording with beat, no upload on streaming platforms)`;

    const rnbTags = [
      'rnb type beat',
      'free rnb type beat',
      'type beat',
      'trap soul type beat',
      'rnb beats',
      'smooth rnb type beat',
      'rnb instrumental',
      'guitar rnb type beat',
      'summer walker type beat',
      'trapsoul type beat',
      'bryson tiller type beat',
      'free trapsoul type beat',
      'drake type beat',
      'smooth type beat',
      'melodic type beat',
      'rnb beat',
      'rap beats',
      'beats',
      'brent faiyaz type beat',
      'hip hop beats',
      'freestyle beats',
    ];

    const defaultDescription = `🎵 Free beat for non-profit use
💰 Purchase license for commercial use on instagram @sheloveslvmh

This beat is free for NON PROFIT USE ONLY`;

    const defaultTags = [
      'type beat',
      'free beat',
      'beat',
      'type beats',
      'instrumental',
      'rap beat',
      'hip hop',
      'trap beat',
      'beats',
      'music',
      'producer',
      'free type beat',
    ];

    // Use template if available
    let description = isRnB ? rnbDescription : defaultDescription;
    let tags = isRnB ? rnbTags : defaultTags;

    if (metadataTemplate) {
      // Check for conditional descriptions
      if (metadataTemplate.descriptionConditions) {
        let matchedCondition = null;

        // Check each condition against filename
        for (const [keyword, condition] of Object.entries(metadataTemplate.descriptionConditions)) {
          if (keyword === 'default') continue;

          if (cleanName.includes(keyword.toLowerCase())) {
            matchedCondition = condition;
            break;
          }
        }

        // Use matched condition or default
        if (matchedCondition) {
          description = matchedCondition.text;
          if (matchedCondition.tags) {
            tags = matchedCondition.tags;
          }
        } else if (metadataTemplate.descriptionConditions.default) {
          description = metadataTemplate.descriptionConditions.default.text;
          if (metadataTemplate.descriptionConditions.default.tags) {
            tags = metadataTemplate.descriptionConditions.default.tags;
          }
        }
      } else if (metadataTemplate.descriptionTemplate) {
        // Old format support
        description = metadataTemplate.descriptionTemplate
          .replace('{bpm}', 'Unknown')
          .replace('{key}', 'Unknown');
      }

      if (metadataTemplate.defaultTags && metadataTemplate.defaultTags.length > 0) {
        tags = metadataTemplate.defaultTags;
      }
    }

    return {
      title,
      description,
      tags,
    };
  }
}

export default AIMetadataGenerator;
