# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.5.0 application named "labubufy" built with TypeScript, React 19, and Tailwind CSS v4. It follows the Next.js App Router architecture and uses the latest versions of all major dependencies.

## Development Commands

- `npm run dev` - Start development server (runs on http://localhost:3000)
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint with Next.js TypeScript configuration

## Architecture

### App Router Structure
- Uses Next.js App Router (`app/` directory)
- Root layout in `app/layout.tsx` with global font configuration (Geist Sans/Mono)
- Main page component in `app/page.tsx`
- Global styles in `app/globals.css`

### Styling & Design System
- Tailwind CSS v4 with PostCSS integration
- CSS custom properties for theming with dark mode support
- Theme tokens defined in `globals.css` using `@theme inline`
- Font system: Geist Sans (primary) and Geist Mono (code/monospace)

### TypeScript Configuration
- Strict TypeScript setup with path alias `@/*` pointing to root directory
- ESM module resolution with bundler strategy
- Next.js plugin for enhanced TypeScript integration

### Linting & Code Quality
- ESLint with Next.js core-web-vitals and TypeScript extensions
- Ignores standard build directories (`.next/`, `out/`, `build/`)

## Key Files
- `next.config.ts` - Next.js configuration (currently minimal)
- `tsconfig.json` - TypeScript configuration with path aliases
- `eslint.config.mjs` - ESM-based ESLint configuration
- `postcss.config.mjs` - PostCSS setup for Tailwind CSS v4
- `app/layout.tsx` - Root layout with font loading and metadata
- `app/globals.css` - Global styles with CSS custom properties and dark mode

<PRD>

# Labubufy Product Requirements Document

## 1. Introduction

This Product Requirements Document (PRD) outlines the comprehensive specifications for Labubufy, an AI-powered web application that enables users to generate personalized photos of themselves holding popular Labubu dolls. This document serves as the definitive guide for the development team, stakeholders, and quality assurance personnel involved in bringing Labubufy to market.

The PRD establishes clear requirements, acceptance criteria, and technical specifications to ensure successful delivery of a user-friendly, mobile-responsive application that meets the needs of our target demographic while leveraging cutting-edge AI technology through Replicate's API services.

## 2. Product overview

Labubufy is a single-page web application designed to capitalize on the trending popularity of Labubu dolls among young social media users. The application seamlessly combines user-uploaded photos with AI-generated imagery to create realistic, shareable content where users appear to be holding their chosen Labubu doll.

The product leverages two key AI models through Replicate's API: an image merging tool and the Qwen image editing model, working in tandem to produce high-quality, believable composite images. The entire user experience is optimized for quick generation and easy sharing, particularly targeting mobile users who represent the majority of social media content creators.

Key differentiators include the simplicity of the interface, the quality of AI-generated outputs, and the ability to maintain a personal history of generated images for repeat downloads and sharing across multiple platforms.

## 3. Goals and objectives

### 3.1 Primary goals
- Create an intuitive, frictionless experience for generating Labubu photos within 30 seconds
- Achieve a 95% success rate for image generation processes
- Enable viral social media sharing through high-quality, realistic outputs
- Establish Labubufy as the go-to platform for Labubu photo generation

### 3.2 Business objectives
- Capture 60% or more of traffic from mobile devices
- Achieve 80% user flow completion rate from upload to generation
- Maintain sub-3-second initial page load times for optimal user retention
- Build a recurring user base through local history features

### 3.3 User experience objectives
- Provide seamless functionality across all modern browsers and devices
- Ensure WCAG 2.1 AA compliance for accessibility
- Deliver consistent, predictable interactions with clear visual feedback
- Minimize cognitive load through intelligent UI/UX design

## 4. Target audience

### 4.1 Primary audience
- **Age range:** 16-25 years old
- **Demographics:** Students and young professionals
- **Technology proficiency:** Intermediate to advanced smartphone users
- **Social media usage:** Active on Instagram, TikTok, Snapchat, and similar platforms
- **Behavioral traits:** Trend-conscious, values shareable content, seeks unique self-expression

### 4.2 Secondary audience
- **Age range:** 26-35 years old
- **Demographics:** Young adults interested in pop culture and collectibles
- **Use case:** Creating nostalgic or humorous content for social sharing

### 4.3 User context
- **Device usage:** 60% mobile, 40% desktop
- **Peak usage times:** Evenings and weekends
- **Session duration:** 2-5 minutes average
- **Return frequency:** Multiple sessions during trend peaks

## 5. Features and requirements

### 5.1 Photo input system
- **Multiple input methods:**
  - File upload through system file picker
  - Drag-and-drop interface for desktop
  - Camera capture for mobile devices
  - Support for JPEG, PNG, WebP, and HEIC formats
- **Validation requirements:**
  - Maximum file size: 10MB
  - Minimum resolution: 640x640 pixels
  - Automatic format conversion for unsupported types
- **Preview capabilities:**
  - Instant preview upon upload
  - Crop and rotate options (Phase 2 consideration)

### 5.2 Labubu selection interface
- **Display grid:**
  - 6-8 unique Labubu designs in initial release
  - 2x3 or 2x4 grid layout depending on screen size
  - High-quality thumbnail previews (minimum 200x200px)
- **Selection mechanics:**
  - Single-tap/click selection
  - Visual confirmation through border highlight or checkmark
  - Deselection by clicking selected item or choosing another

### 5.3 AI generation pipeline
- **Two-stage processing:**
  - Stage 1: Image merge using `zsxkib/tool-merge-images`
  - Stage 2: Refinement using `qwen/qwen-image-edit`
- **Performance specifications:**
  - Total processing time: < 30 seconds
  - Queue management for concurrent requests
  - Automatic retry on failure (up to 3 attempts)
- **Output specifications:**
  - Resolution: Matching input image or 1080x1080 minimum
  - Format: JPEG with 85% quality compression
  - File size: Optimized for web sharing (< 2MB)

### 5.4 Result management
- **Display options:**
  - In-place replacement of uploaded image
  - Side-by-side comparison view (optional)
  - Fullscreen preview capability
- **Action buttons:**
  - Download to device
  - Share (native share API on mobile)
  - Copy link to clipboard
  - Start new generation

### 5.5 History system
- **Storage implementation:**
  - IndexedDB for image blob storage
  - LocalStorage for metadata
  - Maximum 50 images or 100MB total
- **Gallery features:**
  - Thumbnail grid view
  - Sort by date (newest first)
  - Individual delete capability
  - Bulk clear option
- **Data persistence:**
  - Automatic cleanup of images older than 30 days
  - Export all images as ZIP (Phase 2 consideration)

## 6. User stories and acceptance criteria

### 6.1 Core user journey

**ST-101: First-time photo upload**
- **As a** new user
- **I want to** upload a photo from my device
- **So that** I can create my first Labubu image
- **Acceptance criteria:**
  - Upload button is prominently displayed
  - File picker opens on click/tap
  - Supported formats are clearly indicated
  - Preview appears within 2 seconds of selection
  - Error message displays for unsupported formats

**ST-102: Mobile camera capture**
- **As a** mobile user
- **I want to** take a selfie directly in the app
- **So that** I don't have to switch between apps
- **Acceptance criteria:**
  - Camera option is available on mobile devices
  - Camera permissions are requested appropriately
  - Capture interface includes flip camera option
  - Captured image can be retaken before proceeding

**ST-103: Labubu selection**
- **As a** user
- **I want to** choose from different Labubu styles
- **So that** I can personalize my generated image
- **Acceptance criteria:**
  - All Labubu options are visible without scrolling on desktop
  - Selection is visually confirmed immediately
  - Only one Labubu can be selected at a time
  - Selection persists if user changes photo

**ST-104: Image generation**
- **As a** user
- **I want to** generate my Labubu photo
- **So that** I can share it on social media
- **Acceptance criteria:**
  - Generate button is disabled until photo and Labubu are selected
  - Loading indicator shows during processing
  - Estimated time remaining is displayed
  - Result appears automatically when complete

**ST-105: Download generated image**
- **As a** user
- **I want to** save my generated image
- **So that** I can use it outside the app
- **Acceptance criteria:**
  - Download triggers native save dialog
  - Filename includes timestamp
  - Image quality is maintained
  - Works on all supported browsers

### 6.2 Sharing and social features

**ST-201: Mobile native sharing**
- **As a** mobile user
- **I want to** share directly to my apps
- **So that** I can post quickly to social media
- **Acceptance criteria:**
  - Share button triggers native share sheet
  - Image and optional text are included
  - Fallback to copy link if share API unavailable

**ST-202: Desktop sharing**
- **As a** desktop user
- **I want to** get a shareable link
- **So that** I can post to social media
- **Acceptance criteria:**
  - Copy link button provides temporary URL
  - Link remains active for 24 hours
  - Copied confirmation appears on click

### 6.3 History management

**ST-301: View generation history**
- **As a** returning user
- **I want to** see my previous creations
- **So that** I can download them again
- **Acceptance criteria:**
  - History button/icon is easily accessible
  - Images load in chronological order
  - Thumbnails are clickable for full view
  - Date/time of generation is displayed

**ST-302: Delete from history**
- **As a** user
- **I want to** remove specific images
- **So that** I can manage my storage
- **Acceptance criteria:**
  - Delete option available for each image
  - Confirmation dialog prevents accidents
  - Image is immediately removed from view
  - Storage space is freed

**ST-303: Clear all history**
- **As a** user
- **I want to** clear all saved images
- **So that** I can free up space or maintain privacy
- **Acceptance criteria:**
  - Clear all button is available in history view
  - Warning message explains permanence
  - Requires confirmation to proceed
  - Gallery shows empty state after clearing

### 6.4 Error handling and edge cases

**ST-401: Network failure recovery**
- **As a** user
- **I want to** retry failed generations
- **So that** temporary issues don't block me
- **Acceptance criteria:**
  - Error message clearly explains the issue
  - Retry button is prominently displayed
  - Original selections are preserved
  - Automatic retry happens once before showing error

**ST-402: Storage limit reached**
- **As a** user with many saved images
- **I want to** be notified of storage limits
- **So that** I can manage my history
- **Acceptance criteria:**
  - Warning appears at 80% capacity
  - Cannot save new images at 100% capacity
  - Suggestion to delete old images is provided
  - Storage usage indicator is visible

**ST-403: Unsupported file handling**
- **As a** user
- **I want to** understand file requirements
- **So that** I can provide appropriate images
- **Acceptance criteria:**
  - Error message lists supported formats
  - File size limits are clearly stated
  - Suggestion for file conversion is provided
  - Option to try different file is available

### 6.5 Performance and optimization

**ST-501: Fast page load**
- **As a** user on any device
- **I want to** start using the app quickly
- **So that** I don't lose interest
- **Acceptance criteria:**
  - Initial interactive state within 3 seconds
  - Critical resources load first
  - Labubu images lazy load as needed
  - Loading skeleton shows during fetch

**ST-502: Responsive during processing**
- **As a** user
- **I want to** navigate while generating
- **So that** I can prepare next creation
- **Acceptance criteria:**
  - UI remains responsive during generation
  - Can select different Labubu while processing
  - Can view history during generation
  - Cancel option available during processing

## 7. Technical requirements / stack

### 7.1 Frontend architecture
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript for type safety
- **Styling:** Tailwind CSS for utility-first styling
- **Icons:** Lucide React for consistent iconography
- **State management:** React Context API or Zustand for global state

### 7.2 API integration
- **Replicate API:**
  - Environment variables for API keys
  - Webhook support for async processing
  - Error handling and retry logic
  - Rate limiting compliance

### 7.3 Image processing
- **Client-side optimization:**
  - Canvas API for image resizing
  - WebP conversion where supported
  - EXIF data stripping for privacy
  - Progressive image loading

### 7.4 Storage architecture
- **Browser storage:**
  - IndexedDB for image blobs
  - LocalStorage for user preferences
  - SessionStorage for temporary data
  - Storage quota management

### 7.5 Performance optimization
- **Code splitting:** Route-based splitting
- **Image optimization:** Next.js Image component
- **Caching strategy:** Service Worker for offline capability
- **CDN integration:** Static asset delivery

### 7.6 Security requirements
- **API security:**
  - Server-side API key management
  - Rate limiting per session
  - Input validation and sanitization
- **Privacy:**
  - No permanent server storage of user images
  - Clear data retention policy
  - GDPR compliance considerations

### 7.7 Monitoring and analytics
- **Performance monitoring:** Web Vitals tracking
- **Error tracking:** Sentry or similar service
- **Usage analytics:** Privacy-focused analytics (Plausible/Umami)
- **A/B testing:** Feature flag system for gradual rollouts

## 8. Design and user interface

### 8.1 Visual design principles
- **Aesthetic:** Modern, playful, and approachable
- **Color palette:**
  - Primary: Vibrant purple (#8B5CF6)
  - Secondary: Soft pink (#EC4899)
  - Accent: Bright yellow (#FCD34D)
  - Neutral: Gray scale for UI elements
- **Typography:**
  - Headings: Bold, rounded sans-serif
  - Body: Clean, readable sans-serif
  - Minimum 16px font size for mobile

### 8.2 Layout structure
- **Desktop layout:**
  - Fixed header with logo and history access
  - Two-column main content (60/40 split)
  - Left: Labubu selection and controls
  - Right: Image upload/display area
- **Mobile layout:**
  - Sticky header with compact navigation
  - Single column with stacked sections
  - Fixed bottom action bar for primary CTA

### 8.3 Component design
- **Buttons:**
  - Primary: Filled with gradient background
  - Secondary: Outlined with hover effects
  - Minimum touch target: 44x44px
- **Cards:**
  - Rounded corners (8px radius)
  - Soft shadows for depth
  - Hover state with slight elevation
- **Loading states:**
  - Skeleton screens for content
  - Spinner overlay for processing
  - Progress bar for generation

### 8.4 Interaction patterns
- **Feedback mechanisms:**
  - Haptic feedback on mobile (where supported)
  - Micro-animations for selections
  - Toast notifications for actions
- **Transitions:**
  - Smooth fade between states
  - Spring animations for elements
  - No transition longer than 300ms

### 8.5 Responsive breakpoints
- **Mobile:** 320px - 639px
- **Tablet:** 640px - 1023px
- **Desktop:** 1024px - 1439px
- **Large desktop:** 1440px+

### 8.6 Accessibility design
- **Color contrast:** Minimum 4.5:1 for normal text
- **Focus indicators:** Visible outline on all interactive elements
- **Touch targets:** Minimum 44x44px on mobile
- **Text alternatives:** Descriptive labels for all images
- **Keyboard navigation:** Logical tab order throughout

### 8.7 Empty states and errors
- **Empty history:** Friendly illustration with CTA
- **No photo uploaded:** Ghost image with upload prompt
- **Generation error:** Clear explanation with retry option
- **Offline state:** Cached content with sync indicator

</PRD>
