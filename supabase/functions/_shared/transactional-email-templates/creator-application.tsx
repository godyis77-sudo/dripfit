/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string }

const CreatorApplication = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your DRIPFIT Creator application is in review</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>DRIPFIT ✔ — CREATOR PROGRAM</Text>
        </Section>
        <Heading style={h1}>APPLICATION RECEIVED</Heading>
        <Text style={text}>
          {name ? `${name},` : 'Thanks for applying.'} Your Creator Program application is now in review.
        </Text>
        <Section style={tierGrid}>
          <Text style={tierLabel}>BASE COMMISSION</Text>
          <Text style={tierValue}>$1.00 / Premium upgrade</Text>
          <Text style={tierLabelB}>BONUS TIER (100+ / mo)</Text>
          <Text style={tierValue}>$1.50 / Premium upgrade</Text>
        </Section>
        <Text style={text}>
          We review applications weekly. Approved creators get dashboard access, custom promo codes, and a $25 minimum payout.
        </Text>
        <Text style={footer}>hello@dripfitcheck.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CreatorApplication,
  subject: 'Your DRIPFIT Creator application',
  displayName: 'Creator application',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1A1A1A' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '1px solid #1A1A1A', paddingBottom: '16px', marginBottom: '32px' }
const brandWordmark = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 'bold' as const, color: '#1A1A1A', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, letterSpacing: '0.05em', color: '#1A1A1A', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: 1.6, margin: '0 0 18px' }
const tierGrid = { backgroundColor: '#1A1A1A', padding: '24px', margin: '28px 0' }
const tierLabel = { fontSize: '11px', letterSpacing: '0.2em', color: '#888', margin: '0 0 4px' }
const tierLabelB = { fontSize: '11px', letterSpacing: '0.2em', color: '#888', margin: '16px 0 4px' }
const tierValue = { fontSize: '22px', fontWeight: 'bold' as const, color: '#D4AF37', margin: 0 }
const footer = { fontSize: '12px', color: '#888', margin: '32px 0 0', borderTop: '1px solid #eee', paddingTop: '16px' }
