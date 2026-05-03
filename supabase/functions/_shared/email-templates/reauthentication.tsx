/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>DRIPFIT ✔</Text>
        </Section>
        <Heading style={h1}>VERIFICATION CODE</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>This code expires shortly. Didn't request it? Ignore.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1A1A1A' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '1px solid #1A1A1A', paddingBottom: '16px', marginBottom: '32px' }
const brandWordmark = { fontSize: '14px', letterSpacing: '0.2em', fontWeight: 'bold' as const, color: '#1A1A1A', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, letterSpacing: '0.05em', color: '#1A1A1A', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: 1.6, margin: '0 0 16px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#D4AF37', backgroundColor: '#1A1A1A', padding: '20px', textAlign: 'center' as const, letterSpacing: '0.3em', margin: '0 0 28px' }
const footer = { fontSize: '12px', color: '#888', margin: '32px 0 0', borderTop: '1px solid #eee', paddingTop: '16px' }
