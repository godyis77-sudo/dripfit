
-- Deactivate non-wearable junk
UPDATE product_catalog SET is_active = false WHERE id IN (
  'a37f745c-6113-4e27-b237-582687513e6e', -- CHATEAU JOSUÉ HAND SANITIZER
  '06bb052d-038b-4c08-a7db-a1686b687d88', -- POSTER
  '16fb705e-a078-4cbd-bcfb-98828d1938f9', -- SIGNED VINYL RECORD
  '2b8b32b1-d9e9-4a35-ab52-2eca006ab1b4', -- RECYCLED TEDDY BEAR
  '077e82cc-e6c9-4cc2-a784-f10e1ca27482', -- RETOUCHE FAMILY BLANKET
  '9736c537-b580-43ce-9b2b-6b32d7df8625', -- STOP BEING RACIST POSTER
  'ba341df6-aaf6-414d-a6f7-ca68ed6a690d', -- HHCOMP01 WHITE EDITION WITH OBI (vinyl)
  '61149be8-e4dc-4188-9106-47b34da84a1b', -- HHCOMP01 BLACK EDITION (vinyl)
  'ff38b5bf-1469-4eb7-b1db-47c848b65d82', -- OBJECTION TO FORM PURPLE EDITION (vinyl)
  '5168d42c-3934-47a4-b23b-e524e887a684', -- OBJECTION TO FORM BLACK EDITION (vinyl)
  '745e0d41-ba4b-49d3-bdc8-7a291f71a218', -- ATARAXIA (non-clothing)
  '781cca10-7970-46b6-ab44-103dfa8c72f8', -- MURDER MASK
  '3fe6b357-4813-4497-9b3d-618e2e805483', -- MURDER MASK V2
  '8f12cfea-ea6e-41b1-ad63-27a1945c256f', -- Ski Gloves (accessories, not tryonable)
  '2fd8fba8-8992-4180-8582-e70f5f30cfcb', -- Duffle Gym Bag Jet Black
  '1ce6bf0c-302a-4c66-b87f-a0ef58064946', -- Duffle Gym Bag Silver
  '42400ba3-5b58-485d-810d-4ecccc5c2db8', -- MA QUAD LEATHER DUFFLE BAG
  '5a025266-2c35-4e05-ba9d-ee1aea713dbf'  -- Acne Studios scarves listing page (not a product)
);

-- Recategorize real clothing stuck in 'other'
UPDATE product_catalog SET category = 'bottoms' WHERE id IN (
  'd5a7690a-bc02-477d-8025-4a0ded0002a9', -- "26" Wide Leg Sweatpant
  '58a90879-2f7f-49c7-9d01-5fe3ff15d1f2', -- DROP CROTCH SWEATPANT
  'c8627022-a834-4a3f-91a8-cf2a06583395', -- DROP CROTCH SWEATPANT
  '557dcf35-9ebb-4f34-a3cb-12a5a1bd9dc2', -- Boardshorts
  '5264848a-9bf6-4bd2-b696-1c90cd5e78a1', -- FRENCH ZUMA SHORTS
  'b8ca4ce1-4b49-4dc3-bdb6-78daecb8a690', -- G TIME LA FLARE
  '80d5b978-9b43-4b63-8547-ebb28a801795', -- Basketball Shorts
  'cd7d1bbc-b378-4889-90d4-69cad67377a5', -- Soccer Shorts
  '679e787c-52f4-434b-9635-3064ed46ddf5', -- King Soccer Shorts
  '4db018c9-65ed-4ef3-aad8-725b9395e4d1', -- Running Split Shorts
  '68632672-3df4-4943-963a-4060b443dc5f', -- Running Shorts
  '22c45a41-02a9-4eee-a5a2-c2f7102875d5', -- LOGAN SWEATPANT
  '42e0fd28-f9a1-418d-9618-ea692c83030d', -- McLAREN Shorts
  '0842638f-54d2-40b5-8544-34b4e6e3b693', -- Water Shorts
  'dd3f1e2e-2862-47ce-81f8-9fcc7f4eb0c0', -- HYROX Shorts
  '28058574-59e7-4927-b8a5-f2dc4e1bf529', -- HYROX Biker Shorts
  '26c83667-3ab4-418d-acaa-e111770b9ce8', -- SAN SAN GEAR Shorts
  '9f3a0977-d3ce-4a9f-827c-a72bda627677', -- PUMATECH Shorts
  '50ce6850-0526-41e1-a456-6a5d07646649', -- Scuderia Ferrari Shorts
  '8f583dde-c123-42d0-8b53-1dc6927bf6a3', -- T7 Shorts
  '2032931c-b51e-4eb7-b662-a1b01b8fcc2b', -- TEAM DÉPT. SWEATPANT
  '647a94f9-3c5e-4fa5-8405-b48b0415b477'  -- Sunfaded Classic Sweatpant
) AND is_active = true;

-- Recategorize headband
UPDATE product_catalog SET category = 'hats' WHERE id = '8712b153-8427-4416-b797-6d88a6a9987e' AND is_active = true;

-- Recategorize waistcoat
UPDATE product_catalog SET category = 'outerwear' WHERE id = 'bdd6154c-c306-45ec-94cc-6473db113146' AND is_active = true;

-- Recategorize mesh top
UPDATE product_catalog SET category = 'tops' WHERE id = '4ddae8c9-9355-419b-9f5d-f3176653fb83' AND is_active = true;

-- Recategorize socks (keep active but move out of other)
UPDATE product_catalog SET category = 'accessories' WHERE id = '6c11eaf5-8164-4fed-8cc8-5399b74cb8fd' AND is_active = true;

-- Recategorize leather tie
UPDATE product_catalog SET category = 'accessories' WHERE id = 'eb9ee5e3-454c-4745-9ae4-f79790cd4f0c' AND is_active = true;
