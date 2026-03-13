UPDATE product_catalog SET brand = 'Steve Madden' WHERE LOWER(brand) = 'steve madden';
UPDATE product_catalog SET brand = 'On Running' WHERE LOWER(brand) IN ('on running', 'on');
UPDATE product_catalog SET brand = 'Columbia' WHERE LOWER(brand) = 'columbia';
UPDATE product_catalog SET brand = 'Victoria''s Secret' WHERE LOWER(brand) = 'victoria''s secret';
UPDATE product_catalog SET brand = 'Arc''teryx' WHERE LOWER(brand) = 'arc''teryx';
UPDATE product_catalog SET brand = 'Anthropologie' WHERE LOWER(brand) = 'anthropologie';