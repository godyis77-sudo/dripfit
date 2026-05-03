/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { companyName?: string; role?: string }

const PartnershipConfirmation = ({ companyName, role }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Conversation started with DRIPFIT</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>DRIPFIT ✔</Text>
        </Section>
        <Heading style={h1}>THE CONVERSATION HAS STARTED</Heading>
        <Text style={text}>
          {companyName ? `Thanks ${companyName}` : 'Thanks'} — we received your partnership inquiry{role ? ` from ${role}` : ''}.
        </Text>
        <Text style={text}>
          A member of our team will reply within 48 hours with next steps, case studies on return reduction, and a tailored integration plan.
        </Text>
        <Section style={statBox}>
          <Text style={statLabel}>AVERAGE RETURN REDUCTION</Text>
          <Text style={statValue}>30–40%</Text>
        </Section>
        <Text style={footer}>partnerships@dripfitcheck.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartnershipConfirmation,
  subject: 'Your DRIPFIT partnership inquiry',
  displayName: 'Partnership confirmation',
  previewData: { companyName: 'Acme Apparel', role: 'Head of Ecommerce' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1A1A1A' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '1px solid #1A1A1A', paddingBottom: '16px', marginBottom: '32px' }
const brandWordmark = { fontSize: '14px', letterSpacing: '0.2em', fontWeight: 'bold' as const, color: '#1A1A1A', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, letterSpacing: '0.05em', color: '#1A1A1A', margin: '0 0 24px', lineHeight: 1.2 }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: 1.6, margin: '0 0 18px' }
const statBox = { backgroundColor: '#1A1A1A', padding: '24px', margin: '28px 0', textAlign: 'center' as const }
const statLabel = { fontSize: '11px', letterSpacing: '0.2em', color: '#D4AF37', margin: '0 0 6px' }
const statValue = { fontSize: '32px', fontWeight: 'bold' as const, color: '#D4AF37', margin: 0, letterSpacing: '0.05em' }
const footer = { fontSize: '12px', color: '#888', margin: '32px 0 0', borderTop: '1px solid #eee', paddingTop: '16px' }
