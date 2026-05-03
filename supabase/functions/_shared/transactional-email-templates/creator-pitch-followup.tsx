/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  ctaUrl?: string
}

const CreatorPitchFollowup = ({ name, ctaUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Bumping this — DRIPFIT Creator Program</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>DRIPFIT ✔ — CREATOR PROGRAM</Text>
        </Section>

        <Heading style={h1}>{name ? `Hey ${name} —` : 'Hey —'}</Heading>

        <Text style={text}>
          Bumping this in case it got buried. No pressure either way.
        </Text>

        <Text style={text}>
          If you want to just try the app first, no commitment — scan takes 60 seconds and you'll see your exact size at every brand we cover.
        </Text>

        {ctaUrl ? (
          <Section style={{ margin: '28px 0' }}>
            <Button href={ctaUrl} style={button}>Try DRIPFIT — 60 seconds</Button>
          </Section>
        ) : null}

        <Text style={signoff}>— DRIPFIT Founder Team</Text>
        <Text style={footer}>hello@dripfitcheck.com · dripfitcheck.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CreatorPitchFollowup,
  subject: 'Bumping this — DRIPFIT Creator Program',
  displayName: 'Creator pitch follow-up',
  previewData: { name: 'Alex', ctaUrl: 'https://dripfitcheck.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1A1A1A' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '1px solid #1A1A1A', paddingBottom: '16px', marginBottom: '32px' }
const brandWordmark = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 'bold' as const, color: '#1A1A1A', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1A1A1A', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: 1.6, margin: '0 0 18px' }
const button = { backgroundColor: '#D4AF37', color: '#1A1A1A', padding: '14px 28px', fontSize: '14px', fontWeight: 'bold' as const, letterSpacing: '0.1em', textDecoration: 'none', textTransform: 'uppercase' as const }
const signoff = { fontSize: '14px', color: '#1A1A1A', margin: '28px 0 0' }
const footer = { fontSize: '12px', color: '#888', margin: '24px 0 0', borderTop: '1px solid #eee', paddingTop: '16px' }
