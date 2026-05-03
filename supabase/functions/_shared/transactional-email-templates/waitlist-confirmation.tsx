/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const WaitlistConfirmation = () => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're on THE INFINITE CLOSET waitlist</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>DRIPFIT ✔</Text>
        </Section>
        <Heading style={h1}>YOU'RE IN.</Heading>
        <Text style={text}>
          You just secured early access to THE INFINITE CLOSET — the AI sizing engine trusted by fits-first shoppers.
        </Text>
        <Section style={pillBox}>
          <Text style={pillLabel}>STATUS</Text>
          <Text style={pillValue}>WAITLISTED</Text>
        </Section>
        <Text style={text}>
          We'll drop you a note the moment your invite is ready. Sizing intel and weekly fits land in your inbox until then.
        </Text>
        <Text style={footer}>hello@dripfitcheck.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WaitlistConfirmation,
  subject: 'You\'re on the DRIPFIT waitlist',
  displayName: 'Waitlist confirmation',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1A1A1A' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '1px solid #1A1A1A', paddingBottom: '16px', marginBottom: '32px' }
const brandWordmark = { fontSize: '14px', letterSpacing: '0.2em', fontWeight: 'bold' as const, color: '#1A1A1A', margin: 0 }
const h1 = { fontSize: '32px', fontWeight: 'bold' as const, letterSpacing: '0.05em', color: '#1A1A1A', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: 1.6, margin: '0 0 18px' }
const pillBox = { backgroundColor: '#1A1A1A', padding: '20px', margin: '28px 0', textAlign: 'center' as const }
const pillLabel = { fontSize: '11px', letterSpacing: '0.2em', color: '#888', margin: '0 0 6px' }
const pillValue = { fontSize: '20px', fontWeight: 'bold' as const, color: '#D4AF37', margin: 0, letterSpacing: '0.15em' }
const footer = { fontSize: '12px', color: '#888', margin: '32px 0 0', borderTop: '1px solid #eee', paddingTop: '16px' }
