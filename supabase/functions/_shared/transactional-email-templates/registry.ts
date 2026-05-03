/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as partnershipConfirmation } from './partnership-confirmation.tsx'
import { template as waitlistConfirmation } from './waitlist-confirmation.tsx'
import { template as creatorApplication } from './creator-application.tsx'
import { template as founderWelcome } from './founder-welcome.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'partnership-confirmation': partnershipConfirmation,
  'waitlist-confirmation': waitlistConfirmation,
  'creator-application': creatorApplication,
  'founder-welcome': founderWelcome,
}
