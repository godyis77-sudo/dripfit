/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're invited to {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>DRIPFIT ✔</Text>
        </Section>
        <Heading style={h1}>YOU'RE INVITED</Heading>
        <Text style={text}>
          You've been invited to join <Link href={siteUrl} style={link}>{siteName}</Link>. Tap below to accept and create your account.
        </Text>
        <Button style={button} href={confirmationUrl}>ACCEPT INVITE</Button>
        <Text style={footer}>Not expecting this? Ignore.</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1A1A1A' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '1px solid #1A1A1A', paddingBottom: '16px', marginBottom: '32px' }
const brandWordmark = { fontSize: '14px', letterSpacing: '0.2em', fontWeight: 'bold' as const, color: '#1A1A1A', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, letterSpacing: '0.05em', color: '#1A1A1A', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: 1.6, margin: '0 0 24px' }
const link = { color: '#1A1A1A', textDecoration: 'underline' }
const button = { backgroundColor: '#D4AF37', color: '#1A1A1A', fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '0.15em', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#888', margin: '32px 0 0', borderTop: '1px solid #eee', paddingTop: '16px' }
