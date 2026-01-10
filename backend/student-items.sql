-- Update items with student-friendly prices and working placeholder images
DELETE FROM borrow_requests;
DELETE FROM orders;
DELETE FROM deliveries;
DELETE FROM items;

-- Insert student-friendly items
INSERT INTO items (seller_id, title, description, price, category, condition_status, is_borrowable, borrow_price_per_day, max_borrow_days, images) VALUES
(2, 'Scientific Calculator TI-84', 'Texas Instruments TI-84 Plus graphing calculator. Essential for engineering and math courses.', 3500, 'Electronics', 'good', 1, 50, 10, '["https://via.placeholder.com/300x200/4CAF50/white?text=TI-84+Calculator"]'),
(3, 'Engineering Textbook Set', 'Complete set of 2nd year engineering books: Math, Physics, Computer Science. Good condition.', 2500, 'Books', 'good', 1, 30, 30, '["https://via.placeholder.com/300x200/2196F3/white?text=Engineering+Books"]'),
(4, 'Laptop Stand - Adjustable', 'Portable aluminum laptop stand. Perfect for online classes. Lightweight and foldable.', 1200, 'Accessories', 'like_new', 1, 25, 7, '["https://via.placeholder.com/300x200/FF9800/white?text=Laptop+Stand"]'),
(5, 'Wireless Mouse - Logitech', 'Logitech wireless mouse with USB receiver. Great for presentations and laptop use.', 800, 'Electronics', 'good', 1, 20, 5, '["https://via.placeholder.com/300x200/9C27B0/white?text=Wireless+Mouse"]'),
(6, 'Study Lamp - LED', 'Adjustable LED desk lamp with USB charging port. Eye-friendly lighting for study.', 1500, 'Furniture', 'new', 0, 0, 0, '["https://via.placeholder.com/300x200/607D8B/white?text=LED+Study+Lamp"]'),
(7, 'Backpack - Laptop Compatible', 'Durable backpack with padded laptop compartment. Water-resistant material.', 2200, 'Accessories', 'good', 0, 0, 0, '["https://via.placeholder.com/300x200/795548/white?text=Laptop+Backpack"]'),
(8, 'Bluetooth Earbuds', 'Wireless earbuds with charging case. Good sound quality for classes and music.', 1800, 'Electronics', 'like_new', 1, 40, 3, '["https://via.placeholder.com/300x200/3F51B5/white?text=Bluetooth+Earbuds"]'),
(9, 'Notebook Set - A4', 'Set of 5 A4 notebooks with different subjects. Ruled pages, good quality paper.', 400, 'Stationery', 'new', 0, 0, 0, '["https://via.placeholder.com/300x200/4CAF50/white?text=A4+Notebooks"]'),
(10, 'USB Flash Drive 32GB', 'SanDisk 32GB USB 3.0 flash drive. Fast data transfer for assignments and projects.', 600, 'Electronics', 'good', 1, 15, 7, '["https://via.placeholder.com/300x200/FF5722/white?text=USB+32GB"]'),
(11, 'Mechanical Pencil Set', 'Set of 3 mechanical pencils with extra leads and erasers. Perfect for technical drawings.', 350, 'Stationery', 'new', 0, 0, 0, '["https://via.placeholder.com/300x200/009688/white?text=Mechanical+Pencils"]');