# WYSIWYG Rich Text Editor Component

A "What You See Is What You Get" rich text editor component for Angular applications that displays formatted text while saving as markdown.

## Features

- **WYSIWYG Editing**: See bold, italic, underline, and other formatting as you type
- **Toolbar Controls**: Click buttons to format text
- **Keyboard Shortcuts**: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline)
- **Headings**: H1, H2, H3 support with visual formatting
- **Lists**: Bullet and numbered lists with proper indentation
- **Links**: Click to add/edit links with URL prompt
- **Inline Code**: Code formatting with monospace font
- **Character Limit**: Optional character limit with validation
- **Copy to Clipboard**: Optional copy button functionality
- **Markdown Output**: Saves content as clean markdown for backend storage
- **Accessibility**: Proper focus management and keyboard navigation

## Usage

```typescript
import { RichTextComponent } from './path/to/rich-text/rich-text';

// In your component
@Component({
  template: `
    <app-rich-text
      [label]="'Description'"
      [placeholder]="'Enter your text...'"
      [characterLimit]="500"
      [copyable]="true"
      [(ngModel)]="description">
    </app-rich-text>
  `,
  imports: [RichTextComponent]
})
export class MyComponent {
  description = ''; // Will contain markdown
}
```

## How It Works

1. **Display**: The component converts markdown to HTML for rich visual display
2. **Editing**: Users interact with a contenteditable div seeing formatted text
3. **Storage**: When content changes, HTML is converted back to markdown
4. **Data Binding**: The ngModel contains clean markdown for backend storage

## Inputs

- `label` - Label for the input field
- `placeholder` - Placeholder text shown when empty
- `characterLimit` - Maximum number of characters (0 = no limit)
- `copyable` - Show copy button for copying markdown content
- `pattern` - Validation pattern (string or RegExp)
- `patternErrorMsg` - Custom error message for pattern validation
- `required` - Mark field as required
- `disabled` - Disable the input

## Toolbar Features

- **Bold** (Ctrl+B): Makes text bold
- **Italic** (Ctrl+I): Makes text italic  
- **Underline** (Ctrl+U): Underlines text
- **Strikethrough**: Strikes through text
- **Headings**: H1, H2, H3 formatting
- **Lists**: Bullet and numbered lists
- **Links**: Insert/edit hyperlinks
- **Code**: Inline code formatting

## Markdown Output

The component automatically converts visual formatting to markdown:

- **Bold**: `**text**`
- *Italic*: `_text_`
- <u>Underline</u>: `<u>text</u>`
- ~~Strikethrough~~: `~~text~~`
- Headings: `# H1`, `## H2`, `### H3`
- Lists: `- item` (unordered), `1. item` (ordered)
- Links: `[text](url)`
- Code: `` `code` ``

## Browser Compatibility

Uses standard `contenteditable` and `document.execCommand()` APIs. Supported in:
- Chrome/Edge 15+
- Firefox 14+
- Safari 6+

## Styling

The component includes comprehensive SCSS styling with CSS custom properties:

- `--color-border` - Border colors
- `--color-surface` - Background colors
- `--color-primary` - Primary accent color
- `--color-text-secondary` - Secondary text color

Active toolbar buttons are automatically highlighted when their formatting is applied to the current selection.

## Notes

- Content is stored as markdown but displayed as rich formatted text
- Users never see markdown syntax during editing
- Perfect for CMSs, blogs, and content management applications
- Handles paste operations and maintains formatting consistency
