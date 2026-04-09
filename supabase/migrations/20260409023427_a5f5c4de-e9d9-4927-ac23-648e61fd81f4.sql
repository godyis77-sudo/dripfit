
UPDATE product_catalog SET is_active = false WHERE id IN (
  -- Pin badges
  '18a0a1e9-612c-4ea6-886a-b6f5186e9c09',
  'f474483b-de66-4797-9488-6544a390eccf',
  '737b2945-566b-459d-85c5-59260ce34419',
  '07f177db-d467-4efa-96e3-e4c062c5c9e1',
  'ea3c4576-a347-4d08-bac8-18ab3e1bf7df',
  '6d4a66aa-4d53-4c7b-a2f1-16630c8b204c',
  -- Keyrings
  '2b5d6075-5e58-4217-8397-cbc1fc90f5de',
  -- Notebooks
  '76a9b5a5-9a19-47e8-9868-e90a5b2741f5',
  -- Wallets / card holders (non-wearable)
  '8a166aba-4e6b-4536-96a6-fcd036dbc44e',
  '0a5e823b-4926-4fdf-b9ef-15692199aa4b',
  -- Nike Shoe Finder (not a product)
  '29bba94e-ae0e-4fb0-963b-d4a761142271'
);
