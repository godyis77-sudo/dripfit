/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  personalNote?: string
  ctaUrl?: string
}

const CreatorPitch = ({ name, personalNote, ctaUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{name ? `${name} x DRIPFIT — cash commissions, not credits` : 'DRIPFIT Creator Program — cash commissions'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>DRIPFIT ✔ — CREATOR PROGRAM</Text>
        </Section>

        <Heading style={h1}>{name ? `Hey ${name},` : 'Hey,'}</Heading>

        {personalNote ? (
          <Text style={text}>{personalNote}</Text>
        ) : null}

        <Text style={text}>
          DRIPFIT is the AI app that scans your body and tells you your exact size at every brand — Arc'teryx, Aritzia, Zara, COS, you name it. No more guessing M vs L.
        </Text>

        <Section style={tierGrid}>
          <Text style={tierLabel}>BASE COMMISSION</Text>
          <Text style={tierValue}>$1.00 / Premium upgrade</Text>
          <Text style={tierLabelB}>BONUS TIER (100+ / mo)</Text>
          <Text style={tierValue}>$1.50 / Premium upgrade</Text>
        </Section>

        <Text style={text}>
          What you get: cash payouts at $25 minimum (PayPal or bank), your own promo code that drops 10 bonus try-ons for your audience, lifetime Premium access, real-time dashboard.
        </Text>

        {ctaUrl ? (
          <Section style={{ margin: '28px 0' }}>
            <Button href={ctaUrl} style={button}>Try it first — 60 seconds</Button>
          </Section>
        ) : null}

        <Text style={text}>
          Want me to set you up with early access? Just reply yes and I'll send your link.
        </Text>

        <Text style={signoff}>— DRIPFIT Founder Team</Text>
        <Text style={footer}>hello@dripfitcheck.com · dripfitcheck.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CreatorPitch,
  subject: (data: Record<string, any>) =>
    data?.name ? `${data.name} x DRIPFIT — cash commissions, not credits` : 'DRIPFIT — cash commissions, not credits',
  displayName: 'Creator pitch',
  previewData: {
    name: 'Alex',
    personalNote: 'Loved your last fit check breakdown — the Aritzia sizing rant especially. Reaching out because I think DRIPFIT is exactly the tool your audience has been asking you for.',
    ctaUrl: 'https://dripfitcheck.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1A1A1A' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '1px solid #1A1A1A', paddingBottom: '16px', marginBottom: '32px' }
const brandWordmark = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 'bold' as const, color: '#1A1A1A', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1A1A1A', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: 1.6, margin: '0 0 18px' }
const tierGrid = { backgroundColor: '#1A1A1A', padding: '24px', margin: '28px 0' }
const tierLabel = { fontSize: '11px', letterSpacing: '0.2em', color: '#888', margin: '0 0 4px' }
const tierLabelB = { fontSize: '11px', letterSpacing: '0.2em', color: '#888', margin: '16px 0 4px' }
const tierValue = { fontSize: '22px', fontWeight: 'bold' as const, color: '#D4AF37', margin: 0 }
const button = { backgroundColor: '#D4AF37', color: '#1A1A1A', padding: '14px 28px', fontSize: '14px', fontWeight: 'bold' as const, letterSpacing: '0.1em', textDecoration: 'none', textTransform: 'uppercase' as const }
const signoff = { fontSize: '14px', color: '#1A1A1A', margin: '28px 0 0' }
const footer = { fontSize: '12px', color: '#888', margin: '24px 0 0', borderTop: '1px solid #eee', paddingTop: '16px' }
