/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { memberNumber?: number }

const FounderWelcome = ({ memberNumber }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to the DRIPFIT Founding 100</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>DRIPFIT ✔ — FOUNDING MEMBER</Text>
        </Section>
        <Heading style={h1}>WELCOME, FOUNDER.</Heading>
        <Text style={text}>
          Your access has been activated. You are part of the first 100 — the people who shape THE INFINITE CLOSET.
        </Text>
        <Section style={badgeBox}>
          <Text style={badgeLabel}>MEMBER</Text>
          <Text style={badgeValue}>
            #{memberNumber ?? '—'} / 100
          </Text>
          <Text style={badgeLabelB}>STATUS</Text>
          <Text style={badgeStatus}>LIFETIME ACCESS</Text>
        </Section>
        <Text style={text}>
          Unlimited try-ons. Direct line to the team. Early drops before anyone else.
        </Text>
        <Text style={footer}>hello@dripfitcheck.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FounderWelcome,
  subject: 'Welcome to the DRIPFIT Founding 100',
  displayName: 'Founder welcome',
  previewData: { memberNumber: 27 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1A1A1A' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '1px solid #D4AF37', paddingBottom: '16px', marginBottom: '32px' }
const brandWordmark = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 'bold' as const, color: '#D4AF37', margin: 0 }
const h1 = { fontSize: '28px', fontWeight: 'bold' as const, letterSpacing: '0.05em', color: '#1A1A1A', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: 1.6, margin: '0 0 18px' }
const badgeBox = { backgroundColor: '#1A1A1A', padding: '28px', margin: '28px 0', textAlign: 'center' as const, border: '1px solid #D4AF37' }
const badgeLabel = { fontSize: '11px', letterSpacing: '0.2em', color: '#888', margin: '0 0 6px' }
const badgeLabelB = { fontSize: '11px', letterSpacing: '0.2em', color: '#888', margin: '16px 0 6px' }
const badgeValue = { fontSize: '28px', fontWeight: 'bold' as const, color: '#D4AF37', margin: 0, letterSpacing: '0.1em' }
const badgeStatus = { fontSize: '14px', fontWeight: 'bold' as const, color: '#D4AF37', margin: 0, letterSpacing: '0.15em' }
const footer = { fontSize: '12px', color: '#888', margin: '32px 0 0', borderTop: '1px solid #eee', paddingTop: '16px' }
