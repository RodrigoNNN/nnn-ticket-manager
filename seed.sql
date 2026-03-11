-- ============================================================
-- NNN Ticket Manager — Full Seed Data
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── 1. TICKET TYPES (8 more to complement existing "New Campaign") ───

INSERT INTO ticket_types (id, name, color, is_active, instructions, custom_fields) VALUES
('tt-new-spa', 'New Spa', '#10B981', true, 'Onboard a new spa client. Ensure all departments are aligned.', '[]'),
('tt-price-change', 'Campaign Price Change', '#F59E0B', true, 'Update campaign pricing across all platforms.', '[{"id":"cf-old-price","label":"Old Price","type":"number","required":true},{"id":"cf-new-price","label":"New Price","type":"number","required":true}]'),
('tt-budget-change', 'Budget Change', '#EF4444', true, 'Adjust monthly ad budget for a client.', '[{"id":"cf-old-budget","label":"Previous Budget","type":"number","required":true},{"id":"cf-new-budget","label":"New Budget","type":"number","required":true}]'),
('tt-status-change', 'Service Status Change', '#8B5CF6', true, 'Change the active/paused status of a service.', '[{"id":"cf-action","label":"Action","type":"select","required":true,"options":["Pause","Resume","Cancel"]}]'),
('tt-avail-change', 'Availability Change', '#EC4899', true, 'Update spa availability or scheduling windows.', '[]'),
('tt-perf-issues', 'Spa Performance Issues', '#DC2626', true, 'Address underperforming campaigns or KPI misses.', '[{"id":"cf-issue-type","label":"Issue Type","type":"select","required":true,"options":["Low Arrivals","High CPA","Low CTR","Quality Issues"]}]'),
('tt-ad-pause', 'Ad Pause Request', '#6B7280', true, 'Pause all active ads for a spa temporarily.', '[{"id":"cf-reason","label":"Pause Reason","type":"textarea","required":true}]'),
('tt-ghl-migration', 'Campaign GHL Migration', '#0EA5E9', true, 'Migrate campaign tracking from legacy to GoHighLevel.', '[]')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. SUBTASK TEMPLATES per ticket type ───

-- New Campaign subtasks (for existing tt-1772657081762)
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
('tt-1772657081762', 'Management', 'Notify AM and TL', 5),
('tt-1772657081762', 'Marketing', 'Request landing page', 10),
('tt-1772657081762', 'Marketing', 'Choose ad creatives', 15),
('tt-1772657081762', 'Marketing', 'Write ad copy', 20),
('tt-1772657081762', 'IT', 'Pixel & tracking setup', 20),
('tt-1772657081762', 'IT', 'Campaign configuration', 30),
('tt-1772657081762', 'IT', 'QA & launch check', 15),
('tt-1772657081762', 'Accounting', 'Budget allocation setup', 10),
('tt-1772657081762', 'Accounting', 'Billing update', 5);

-- New Spa subtasks
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
('tt-new-spa', 'Management', 'Client onboarding call', 30),
('tt-new-spa', 'Management', 'Assign team members', 10),
('tt-new-spa', 'Marketing', 'Create brand assets', 45),
('tt-new-spa', 'Marketing', 'Set up landing page', 60),
('tt-new-spa', 'Marketing', 'Design social templates', 30),
('tt-new-spa', 'IT', 'CRM setup (Salesforce)', 30),
('tt-new-spa', 'IT', 'Pixel installation', 20),
('tt-new-spa', 'IT', 'Domain & DNS config', 15),
('tt-new-spa', 'Accounting', 'Contract & billing setup', 20),
('tt-new-spa', 'Accounting', 'Payment processing setup', 15);

-- Campaign Price Change subtasks
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
('tt-price-change', 'Management', 'Approve price change', 5),
('tt-price-change', 'Marketing', 'Update landing page pricing', 15),
('tt-price-change', 'Marketing', 'Update ad creatives', 20),
('tt-price-change', 'IT', 'Update CRM pricing fields', 10),
('tt-price-change', 'Accounting', 'Update billing records', 10);

-- Budget Change subtasks
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
('tt-budget-change', 'Management', 'Approve budget change', 5),
('tt-budget-change', 'IT', 'Adjust Meta Ads budget', 10),
('tt-budget-change', 'IT', 'Update daily spend caps', 5),
('tt-budget-change', 'Accounting', 'Update financial forecast', 15),
('tt-budget-change', 'Accounting', 'Adjust billing schedule', 10);

-- Service Status Change subtasks
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
('tt-status-change', 'Management', 'Confirm status change with client', 10),
('tt-status-change', 'Marketing', 'Update landing page status', 10),
('tt-status-change', 'IT', 'Toggle campaign status in Meta', 5),
('tt-status-change', 'IT', 'Update CRM records', 10);

-- Availability Change subtasks
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
('tt-avail-change', 'Management', 'Coordinate with spa on new hours', 15),
('tt-avail-change', 'Marketing', 'Update booking availability copy', 10),
('tt-avail-change', 'IT', 'Update scheduling system', 15);

-- Spa Performance Issues subtasks
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
('tt-perf-issues', 'Management', 'Review performance data', 20),
('tt-perf-issues', 'Management', 'Client performance call', 30),
('tt-perf-issues', 'Marketing', 'Audit ad creatives', 30),
('tt-perf-issues', 'Marketing', 'Test new audiences', 25),
('tt-perf-issues', 'IT', 'Check pixel & tracking', 20),
('tt-perf-issues', 'IT', 'Analyze funnel drop-off', 25);

-- Ad Pause Request subtasks
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
('tt-ad-pause', 'Management', 'Confirm pause with client', 5),
('tt-ad-pause', 'IT', 'Pause all active campaigns', 10),
('tt-ad-pause', 'IT', 'Document campaign state', 15),
('tt-ad-pause', 'Accounting', 'Adjust billing', 10);

-- GHL Migration subtasks
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
('tt-ghl-migration', 'Management', 'Schedule migration window', 10),
('tt-ghl-migration', 'IT', 'Export legacy data', 30),
('tt-ghl-migration', 'IT', 'Import to GoHighLevel', 45),
('tt-ghl-migration', 'IT', 'Verify data integrity', 20),
('tt-ghl-migration', 'IT', 'Update webhook endpoints', 15),
('tt-ghl-migration', 'Marketing', 'Test form submissions', 15);

-- ─── 3. MORE SPA CLIENTS ───

INSERT INTO spas (id, name, location, country, status, tier, monthly_budget, arrival_goal, onboarding_data, onboarded_at, onboarded_via) VALUES
('s-glow', 'Glow Aesthetics', 'Miami, FL', 'USA', 'active', 1, 3000, 40, '{"owner":"Sarah Johnson","email":"sarah@glowaesthetics.com","phone":"305-555-0101"}', '2025-11-15T10:00:00Z', 'manual'),
('s-radiance', 'Radiance Skin Studio', 'Los Angeles, CA', 'USA', 'active', 2, 2500, 30, '{"owner":"Michelle Lee","email":"michelle@radianceskin.com","phone":"310-555-0202"}', '2025-12-01T14:00:00Z', 'form'),
('s-serenity', 'Serenity Wellness Spa', 'Toronto, ON', 'Canada', 'active', 1, 4000, 50, '{"owner":"Emma Wilson","email":"emma@serenitywellness.ca","phone":"416-555-0303"}', '2026-01-10T09:00:00Z', 'manual'),
('s-luxe', 'Luxe Beauty Bar', 'New York, NY', 'USA', 'active', 3, 1500, 20, '{"owner":"Diana Chen","email":"diana@luxebeautybar.com","phone":"212-555-0404"}', '2026-01-20T11:00:00Z', 'form'),
('s-zenith', 'Zenith MedSpa', 'Vancouver, BC', 'Canada', 'active', 1, 5000, 60, '{"owner":"Dr. Patel","email":"patel@zenithmedspa.ca","phone":"604-555-0505"}', '2026-02-01T08:00:00Z', 'manual'),
('s-aura', 'Aura Skin Clinic', 'Chicago, IL', 'USA', 'active', 2, 2000, 25, '{"owner":"Lisa Martinez","email":"lisa@auraskinclinic.com","phone":"312-555-0606"}', '2026-02-10T15:00:00Z', 'manual'),
('s-bloom', 'Bloom Facial Studio', 'Houston, TX', 'USA', 'active', 2, 1800, 22, '{"owner":"Ashley Brown","email":"ashley@bloomfacial.com","phone":"713-555-0707"}', '2026-02-15T10:00:00Z', 'form'),
('s-pure', 'Pure Glow Spa', 'Calgary, AB', 'Canada', 'active', 3, 1200, 15, '{"owner":"Kate Thompson","email":"kate@pureglowspa.ca","phone":"403-555-0808"}', '2026-02-20T13:00:00Z', 'manual')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. SPA PROMOS ───

INSERT INTO spa_promos (id, spa_id, name, price, value_price, active) VALUES
('p-glow-1', 's-glow', 'Premium LED Facial', 149, 299, true),
('p-glow-2', 's-glow', 'Anti-Aging Package', 199, 399, true),
('p-radiance-1', 's-radiance', 'Hydrafacial Special', 129, 249, true),
('p-radiance-2', 's-radiance', 'Skin Rejuvenation', 179, 349, false),
('p-serenity-1', 's-serenity', 'Deep Cleanse Facial', 159, 319, true),
('p-serenity-2', 's-serenity', 'LED Skin Tightening', 189, 379, true),
('p-luxe-1', 's-luxe', 'Express LED Treatment', 79, 159, true),
('p-zenith-1', 's-zenith', 'VIP Facial Experience', 249, 499, true),
('p-zenith-2', 's-zenith', 'Collagen Boost Therapy', 199, 399, true),
('p-aura-1', 's-aura', 'Glow Up Facial', 139, 279, true),
('p-bloom-1', 's-bloom', 'Hydrating LED Facial', 119, 239, true),
('p-pure-1', 's-pure', 'Basic LED Session', 69, 139, true)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. SPA TEAM ASSIGNMENTS ───

INSERT INTO spa_team_members (spa_id, department, user_id) VALUES
-- Glow Aesthetics
('s-glow', 'Management', 'u-1772494644989'),
('s-glow', 'Marketing', 'u-1772494615439'),
('s-glow', 'IT', 'u-1772494665671'),
('s-glow', 'Accounting', 'u-1772494684671'),
-- Radiance Skin Studio
('s-radiance', 'Management', 'admin-1'),
('s-radiance', 'Marketing', 'u-1772494615439'),
('s-radiance', 'IT', 'u-1772494665671'),
('s-radiance', 'Accounting', 'u-1772494684671'),
-- Serenity Wellness
('s-serenity', 'Management', 'u-1772494644989'),
('s-serenity', 'Marketing', 'u-1772494615439'),
('s-serenity', 'IT', 'u-1772494665671'),
('s-serenity', 'Accounting', 'u-1772494684671'),
-- Luxe Beauty Bar
('s-luxe', 'Management', 'admin-1'),
('s-luxe', 'Marketing', 'u-1772494615439'),
('s-luxe', 'IT', 'u-1772494665671'),
-- Zenith MedSpa
('s-zenith', 'Management', 'u-1772494644989'),
('s-zenith', 'Marketing', 'u-1772494615439'),
('s-zenith', 'IT', 'u-1772494665671'),
('s-zenith', 'Accounting', 'u-1772494684671'),
-- Aura Skin Clinic
('s-aura', 'Management', 'admin-1'),
('s-aura', 'Marketing', 'u-1772494615439'),
('s-aura', 'IT', 'u-1772494665671'),
-- Bloom Facial Studio
('s-bloom', 'Management', 'u-1772494644989'),
('s-bloom', 'Marketing', 'u-1772494615439'),
('s-bloom', 'IT', 'u-1772494665671'),
('s-bloom', 'Accounting', 'u-1772494684671'),
-- Pure Glow Spa
('s-pure', 'Management', 'admin-1'),
('s-pure', 'Marketing', 'u-1772494615439'),
('s-pure', 'IT', 'u-1772494665671')
ON CONFLICT (spa_id, department, user_id) DO NOTHING;

-- ─── 6. TICKETS (diverse types, statuses, priorities) ───

INSERT INTO tickets (id, ticket_type_id, ticket_type, spa_id, treatment_name, promo_price, value_price, priority, target_audience, due_date, start_ads_date, status, created_by, created_at, additional_info, custom_field_values) VALUES
-- Active tickets (In Progress / Open)
('tk-glow-camp', 'tt-1772657081762', 'New Campaign', 's-glow', 'Premium LED Facial', 149, 299, 'High', 'Women', '2026-03-14', '2026-03-17', 'In Progress', 'u-1772494615439', '2026-03-03T09:00:00Z', 'Client wants to launch ASAP for spring season', '{}'),
('tk-rad-price', 'tt-price-change', 'Campaign Price Change', 's-radiance', 'Hydrafacial Special', 99, 249, 'Medium', 'Both', '2026-03-20', NULL, 'Open', 'admin-1', '2026-03-04T10:00:00Z', 'Lowering price for March promotion', '{"cf-old-price":129,"cf-new-price":99}'),
('tk-ser-budget', 'tt-budget-change', 'Budget Change', 's-serenity', NULL, NULL, NULL, 'High', '', '2026-03-12', NULL, 'In Progress', 'u-1772494644989', '2026-03-02T14:00:00Z', 'Client increasing budget due to good results', '{"cf-old-budget":4000,"cf-new-budget":6000}'),
('tk-luxe-onboard', 'tt-new-spa', 'New Spa', 's-luxe', NULL, NULL, NULL, 'Medium', '', '2026-03-21', NULL, 'In Progress', 'admin-1', '2026-02-28T11:00:00Z', 'New client referral from Glow Aesthetics', '{}'),
('tk-zen-perf', 'tt-perf-issues', 'Spa Performance Issues', 's-zenith', 'VIP Facial Experience', NULL, NULL, 'Immediate', '', '2026-03-10', NULL, 'In Progress', 'u-1772494615439', '2026-03-01T08:00:00Z', 'CPA jumped 40% in last 2 weeks. Need urgent audit.', '{"cf-issue-type":"High CPA"}'),
('tk-aura-camp', 'tt-1772657081762', 'New Campaign', 's-aura', 'Glow Up Facial', 139, 279, 'Medium', 'Both', '2026-03-25', '2026-03-28', 'Open', 'u-1772494615439', '2026-03-05T15:00:00Z', 'Second campaign for Aura targeting men + women', '{}'),
('tk-bloom-status', 'tt-status-change', 'Service Status Change', 's-bloom', 'Hydrating LED Facial', NULL, NULL, 'High', '', '2026-03-11', NULL, 'Open', 'u-1772494644989', '2026-03-04T09:00:00Z', 'Client going on vacation, pause service temporarily', '{"cf-action":"Pause"}'),
('tk-pure-ghl', 'tt-ghl-migration', 'Campaign GHL Migration', 's-pure', NULL, NULL, NULL, 'Medium', '', '2026-03-28', NULL, 'Open', 'u-1772494665671', '2026-03-05T11:00:00Z', 'Migrating from legacy tracking to GHL', '{}'),
('tk-zen-avail', 'tt-avail-change', 'Availability Change', 's-zenith', NULL, NULL, NULL, 'Medium', '', '2026-03-18', NULL, 'Open', 'admin-1', '2026-03-06T10:00:00Z', 'Extended hours starting April 1st', '{}'),
('tk-glow-pause', 'tt-ad-pause', 'Ad Pause Request', 's-glow', NULL, NULL, NULL, 'Immediate', '', '2026-03-08', NULL, 'In Progress', 'u-1772494644989', '2026-03-07T08:00:00Z', 'Emergency pause — client reported booking system down', '{"cf-reason":"Booking system is offline. Client cannot receive new appointments until IT fixes the integration."}'),

-- Completed tickets (Done)
('tk-rad-camp-done', 'tt-1772657081762', 'New Campaign', 's-radiance', 'Skin Rejuvenation', 179, 349, 'High', 'Women', '2026-02-20', '2026-02-24', 'Done', 'u-1772494615439', '2026-02-10T10:00:00Z', 'Initial campaign launch for Radiance', '{}'),
('tk-ser-camp-done', 'tt-1772657081762', 'New Campaign', 's-serenity', 'Deep Cleanse Facial', 159, 319, 'Medium', 'Both', '2026-02-28', '2026-03-03', 'Done', 'u-1772494615439', '2026-02-15T14:00:00Z', 'Launched successfully with strong first week', '{}'),
('tk-zen-budget-done', 'tt-budget-change', 'Budget Change', 's-zenith', NULL, NULL, NULL, 'Medium', '', '2026-02-15', NULL, 'Done', 'admin-1', '2026-02-05T09:00:00Z', 'Increased from $3000 to $5000 monthly', '{"cf-old-budget":3000,"cf-new-budget":5000}')
ON CONFLICT (id) DO NOTHING;

-- ─── 7. TASKS for each ticket ───

-- tk-glow-camp (New Campaign - In Progress)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status, completed_by, completed_at) VALUES
('tk-glow-camp-t0', 'tk-glow-camp', 'Management', 'Notify AM and TL', 5, 'Done', 'u-1772494644989', '2026-03-03T10:00:00Z'),
('tk-glow-camp-t1', 'tk-glow-camp', 'Marketing', 'Request landing page', 10, 'Done', 'u-1772494615439', '2026-03-03T14:00:00Z'),
('tk-glow-camp-t2', 'tk-glow-camp', 'Marketing', 'Choose ad creatives', 15, 'In Progress', NULL, NULL),
('tk-glow-camp-t3', 'tk-glow-camp', 'Marketing', 'Write ad copy', 20, 'Not Started', NULL, NULL),
('tk-glow-camp-t4', 'tk-glow-camp', 'IT', 'Pixel & tracking setup', 20, 'Done', 'u-1772494665671', '2026-03-04T11:00:00Z'),
('tk-glow-camp-t5', 'tk-glow-camp', 'IT', 'Campaign configuration', 30, 'Not Started', NULL, NULL),
('tk-glow-camp-t6', 'tk-glow-camp', 'IT', 'QA & launch check', 15, 'Not Started', NULL, NULL),
('tk-glow-camp-t7', 'tk-glow-camp', 'Accounting', 'Budget allocation setup', 10, 'Done', 'u-1772494684671', '2026-03-04T09:00:00Z'),
('tk-glow-camp-t8', 'tk-glow-camp', 'Accounting', 'Billing update', 5, 'Not Started', NULL, NULL);

-- tk-rad-price (Price Change - Open)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status) VALUES
('tk-rad-price-t0', 'tk-rad-price', 'Management', 'Approve price change', 5, 'Not Started'),
('tk-rad-price-t1', 'tk-rad-price', 'Marketing', 'Update landing page pricing', 15, 'Not Started'),
('tk-rad-price-t2', 'tk-rad-price', 'Marketing', 'Update ad creatives', 20, 'Not Started'),
('tk-rad-price-t3', 'tk-rad-price', 'IT', 'Update CRM pricing fields', 10, 'Not Started'),
('tk-rad-price-t4', 'tk-rad-price', 'Accounting', 'Update billing records', 10, 'Not Started');

-- tk-ser-budget (Budget Change - In Progress)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status, completed_by, completed_at) VALUES
('tk-ser-budget-t0', 'tk-ser-budget', 'Management', 'Approve budget change', 5, 'Done', 'u-1772494644989', '2026-03-02T15:00:00Z'),
('tk-ser-budget-t1', 'tk-ser-budget', 'IT', 'Adjust Meta Ads budget', 10, 'Done', 'u-1772494665671', '2026-03-03T10:00:00Z'),
('tk-ser-budget-t2', 'tk-ser-budget', 'IT', 'Update daily spend caps', 5, 'Not Started', NULL, NULL),
('tk-ser-budget-t3', 'tk-ser-budget', 'Accounting', 'Update financial forecast', 15, 'Not Started', NULL, NULL),
('tk-ser-budget-t4', 'tk-ser-budget', 'Accounting', 'Adjust billing schedule', 10, 'Not Started', NULL, NULL);

-- tk-luxe-onboard (New Spa - In Progress)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status, completed_by, completed_at) VALUES
('tk-luxe-onboard-t0', 'tk-luxe-onboard', 'Management', 'Client onboarding call', 30, 'Done', 'admin-1', '2026-03-01T10:00:00Z'),
('tk-luxe-onboard-t1', 'tk-luxe-onboard', 'Management', 'Assign team members', 10, 'Done', 'admin-1', '2026-03-01T11:00:00Z'),
('tk-luxe-onboard-t2', 'tk-luxe-onboard', 'Marketing', 'Create brand assets', 45, 'In Progress', NULL, NULL),
('tk-luxe-onboard-t3', 'tk-luxe-onboard', 'Marketing', 'Set up landing page', 60, 'Not Started', NULL, NULL),
('tk-luxe-onboard-t4', 'tk-luxe-onboard', 'Marketing', 'Design social templates', 30, 'Not Started', NULL, NULL),
('tk-luxe-onboard-t5', 'tk-luxe-onboard', 'IT', 'CRM setup (Salesforce)', 30, 'Done', 'u-1772494665671', '2026-03-03T14:00:00Z'),
('tk-luxe-onboard-t6', 'tk-luxe-onboard', 'IT', 'Pixel installation', 20, 'In Progress', NULL, NULL),
('tk-luxe-onboard-t7', 'tk-luxe-onboard', 'IT', 'Domain & DNS config', 15, 'Not Started', NULL, NULL),
('tk-luxe-onboard-t8', 'tk-luxe-onboard', 'Accounting', 'Contract & billing setup', 20, 'Done', 'u-1772494684671', '2026-03-02T09:00:00Z'),
('tk-luxe-onboard-t9', 'tk-luxe-onboard', 'Accounting', 'Payment processing setup', 15, 'Not Started', NULL, NULL);

-- tk-zen-perf (Performance Issues - Immediate - In Progress)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status, completed_by, completed_at) VALUES
('tk-zen-perf-t0', 'tk-zen-perf', 'Management', 'Review performance data', 20, 'Done', 'u-1772494644989', '2026-03-01T10:00:00Z'),
('tk-zen-perf-t1', 'tk-zen-perf', 'Management', 'Client performance call', 30, 'Done', 'u-1772494644989', '2026-03-02T14:00:00Z'),
('tk-zen-perf-t2', 'tk-zen-perf', 'Marketing', 'Audit ad creatives', 30, 'In Progress', NULL, NULL),
('tk-zen-perf-t3', 'tk-zen-perf', 'Marketing', 'Test new audiences', 25, 'Not Started', NULL, NULL),
('tk-zen-perf-t4', 'tk-zen-perf', 'IT', 'Check pixel & tracking', 20, 'Done', 'u-1772494665671', '2026-03-03T09:00:00Z'),
('tk-zen-perf-t5', 'tk-zen-perf', 'IT', 'Analyze funnel drop-off', 25, 'In Progress', NULL, NULL);

-- tk-aura-camp (New Campaign - Open)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status) VALUES
('tk-aura-camp-t0', 'tk-aura-camp', 'Management', 'Notify AM and TL', 5, 'Not Started'),
('tk-aura-camp-t1', 'tk-aura-camp', 'Marketing', 'Request landing page', 10, 'Not Started'),
('tk-aura-camp-t2', 'tk-aura-camp', 'Marketing', 'Choose ad creatives', 15, 'Not Started'),
('tk-aura-camp-t3', 'tk-aura-camp', 'Marketing', 'Write ad copy', 20, 'Not Started'),
('tk-aura-camp-t4', 'tk-aura-camp', 'IT', 'Pixel & tracking setup', 20, 'Not Started'),
('tk-aura-camp-t5', 'tk-aura-camp', 'IT', 'Campaign configuration', 30, 'Not Started'),
('tk-aura-camp-t6', 'tk-aura-camp', 'IT', 'QA & launch check', 15, 'Not Started'),
('tk-aura-camp-t7', 'tk-aura-camp', 'Accounting', 'Budget allocation setup', 10, 'Not Started'),
('tk-aura-camp-t8', 'tk-aura-camp', 'Accounting', 'Billing update', 5, 'Not Started');

-- tk-bloom-status (Service Status Change - Open)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status) VALUES
('tk-bloom-status-t0', 'tk-bloom-status', 'Management', 'Confirm status change with client', 10, 'Not Started'),
('tk-bloom-status-t1', 'tk-bloom-status', 'Marketing', 'Update landing page status', 10, 'Not Started'),
('tk-bloom-status-t2', 'tk-bloom-status', 'IT', 'Toggle campaign status in Meta', 5, 'Not Started'),
('tk-bloom-status-t3', 'tk-bloom-status', 'IT', 'Update CRM records', 10, 'Not Started');

-- tk-pure-ghl (GHL Migration - Open)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status) VALUES
('tk-pure-ghl-t0', 'tk-pure-ghl', 'Management', 'Schedule migration window', 10, 'Not Started'),
('tk-pure-ghl-t1', 'tk-pure-ghl', 'IT', 'Export legacy data', 30, 'Not Started'),
('tk-pure-ghl-t2', 'tk-pure-ghl', 'IT', 'Import to GoHighLevel', 45, 'Not Started'),
('tk-pure-ghl-t3', 'tk-pure-ghl', 'IT', 'Verify data integrity', 20, 'Not Started'),
('tk-pure-ghl-t4', 'tk-pure-ghl', 'IT', 'Update webhook endpoints', 15, 'Not Started'),
('tk-pure-ghl-t5', 'tk-pure-ghl', 'Marketing', 'Test form submissions', 15, 'Not Started');

-- tk-zen-avail (Availability Change - Open)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status) VALUES
('tk-zen-avail-t0', 'tk-zen-avail', 'Management', 'Coordinate with spa on new hours', 15, 'Not Started'),
('tk-zen-avail-t1', 'tk-zen-avail', 'Marketing', 'Update booking availability copy', 10, 'Not Started'),
('tk-zen-avail-t2', 'tk-zen-avail', 'IT', 'Update scheduling system', 15, 'Not Started');

-- tk-glow-pause (Ad Pause - Immediate - In Progress)
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status, completed_by, completed_at) VALUES
('tk-glow-pause-t0', 'tk-glow-pause', 'Management', 'Confirm pause with client', 5, 'Done', 'u-1772494644989', '2026-03-07T08:15:00Z'),
('tk-glow-pause-t1', 'tk-glow-pause', 'IT', 'Pause all active campaigns', 10, 'Done', 'u-1772494665671', '2026-03-07T08:30:00Z'),
('tk-glow-pause-t2', 'tk-glow-pause', 'IT', 'Document campaign state', 15, 'In Progress', NULL, NULL),
('tk-glow-pause-t3', 'tk-glow-pause', 'Accounting', 'Adjust billing', 10, 'Not Started', NULL, NULL);

-- Completed tickets tasks
-- tk-rad-camp-done
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status, completed_by, completed_at) VALUES
('tk-rad-done-t0', 'tk-rad-camp-done', 'Management', 'Notify AM and TL', 5, 'Done', 'admin-1', '2026-02-10T11:00:00Z'),
('tk-rad-done-t1', 'tk-rad-camp-done', 'Marketing', 'Request landing page', 10, 'Done', 'u-1772494615439', '2026-02-11T10:00:00Z'),
('tk-rad-done-t2', 'tk-rad-camp-done', 'Marketing', 'Choose ad creatives', 15, 'Done', 'u-1772494615439', '2026-02-12T14:00:00Z'),
('tk-rad-done-t3', 'tk-rad-camp-done', 'Marketing', 'Write ad copy', 20, 'Done', 'u-1772494615439', '2026-02-13T10:00:00Z'),
('tk-rad-done-t4', 'tk-rad-camp-done', 'IT', 'Pixel & tracking setup', 20, 'Done', 'u-1772494665671', '2026-02-14T09:00:00Z'),
('tk-rad-done-t5', 'tk-rad-camp-done', 'IT', 'Campaign configuration', 30, 'Done', 'u-1772494665671', '2026-02-15T10:00:00Z'),
('tk-rad-done-t6', 'tk-rad-camp-done', 'IT', 'QA & launch check', 15, 'Done', 'u-1772494665671', '2026-02-18T09:00:00Z'),
('tk-rad-done-t7', 'tk-rad-camp-done', 'Accounting', 'Budget allocation setup', 10, 'Done', 'u-1772494684671', '2026-02-11T09:00:00Z'),
('tk-rad-done-t8', 'tk-rad-camp-done', 'Accounting', 'Billing update', 5, 'Done', 'u-1772494684671', '2026-02-11T10:00:00Z');

-- tk-ser-camp-done
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status, completed_by, completed_at) VALUES
('tk-ser-done-t0', 'tk-ser-camp-done', 'Management', 'Notify AM and TL', 5, 'Done', 'u-1772494644989', '2026-02-15T15:00:00Z'),
('tk-ser-done-t1', 'tk-ser-camp-done', 'Marketing', 'Request landing page', 10, 'Done', 'u-1772494615439', '2026-02-16T10:00:00Z'),
('tk-ser-done-t2', 'tk-ser-camp-done', 'Marketing', 'Choose ad creatives', 15, 'Done', 'u-1772494615439', '2026-02-17T14:00:00Z'),
('tk-ser-done-t3', 'tk-ser-camp-done', 'Marketing', 'Write ad copy', 20, 'Done', 'u-1772494615439', '2026-02-18T10:00:00Z'),
('tk-ser-done-t4', 'tk-ser-camp-done', 'IT', 'Pixel & tracking setup', 20, 'Done', 'u-1772494665671', '2026-02-19T09:00:00Z'),
('tk-ser-done-t5', 'tk-ser-camp-done', 'IT', 'Campaign configuration', 30, 'Done', 'u-1772494665671', '2026-02-20T10:00:00Z'),
('tk-ser-done-t6', 'tk-ser-camp-done', 'IT', 'QA & launch check', 15, 'Done', 'u-1772494665671', '2026-02-21T09:00:00Z'),
('tk-ser-done-t7', 'tk-ser-camp-done', 'Accounting', 'Budget allocation setup', 10, 'Done', 'u-1772494684671', '2026-02-16T09:00:00Z'),
('tk-ser-done-t8', 'tk-ser-camp-done', 'Accounting', 'Billing update', 5, 'Done', 'u-1772494684671', '2026-02-16T10:00:00Z');

-- tk-zen-budget-done
INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status, completed_by, completed_at) VALUES
('tk-zen-bdone-t0', 'tk-zen-budget-done', 'Management', 'Approve budget change', 5, 'Done', 'u-1772494644989', '2026-02-05T10:00:00Z'),
('tk-zen-bdone-t1', 'tk-zen-budget-done', 'IT', 'Adjust Meta Ads budget', 10, 'Done', 'u-1772494665671', '2026-02-06T09:00:00Z'),
('tk-zen-bdone-t2', 'tk-zen-budget-done', 'IT', 'Update daily spend caps', 5, 'Done', 'u-1772494665671', '2026-02-06T10:00:00Z'),
('tk-zen-bdone-t3', 'tk-zen-budget-done', 'Accounting', 'Update financial forecast', 15, 'Done', 'u-1772494684671', '2026-02-07T09:00:00Z'),
('tk-zen-bdone-t4', 'tk-zen-budget-done', 'Accounting', 'Adjust billing schedule', 10, 'Done', 'u-1772494684671', '2026-02-07T11:00:00Z');

-- ─── 8. TASK ASSIGNMENTS (spread across the week Mar 9-13) ───

INSERT INTO task_assignments (task_id, user_id, role, scheduled_date) VALUES
-- tk-glow-camp tasks
('tk-glow-camp-t0', 'u-1772494644989', 'primary', '2026-03-03'),
('tk-glow-camp-t1', 'u-1772494615439', 'primary', '2026-03-03'),
('tk-glow-camp-t2', 'u-1772494615439', 'primary', '2026-03-09'),
('tk-glow-camp-t3', 'u-1772494615439', 'primary', '2026-03-10'),
('tk-glow-camp-t4', 'u-1772494665671', 'primary', '2026-03-04'),
('tk-glow-camp-t5', 'u-1772494665671', 'primary', '2026-03-10'),
('tk-glow-camp-t6', 'u-1772494665671', 'primary', '2026-03-11'),
('tk-glow-camp-t7', 'u-1772494684671', 'primary', '2026-03-04'),
('tk-glow-camp-t8', 'u-1772494684671', 'primary', '2026-03-11'),

-- tk-rad-price tasks
('tk-rad-price-t0', 'admin-1', 'primary', '2026-03-09'),
('tk-rad-price-t1', 'u-1772494615439', 'primary', '2026-03-10'),
('tk-rad-price-t2', 'u-1772494615439', 'primary', '2026-03-11'),
('tk-rad-price-t3', 'u-1772494665671', 'primary', '2026-03-11'),
('tk-rad-price-t4', 'u-1772494684671', 'primary', '2026-03-12'),

-- tk-ser-budget tasks
('tk-ser-budget-t0', 'u-1772494644989', 'primary', '2026-03-02'),
('tk-ser-budget-t1', 'u-1772494665671', 'primary', '2026-03-03'),
('tk-ser-budget-t2', 'u-1772494665671', 'primary', '2026-03-09'),
('tk-ser-budget-t3', 'u-1772494684671', 'primary', '2026-03-10'),
('tk-ser-budget-t4', 'u-1772494684671', 'primary', '2026-03-10'),

-- tk-luxe-onboard tasks
('tk-luxe-onboard-t0', 'admin-1', 'primary', '2026-03-01'),
('tk-luxe-onboard-t1', 'admin-1', 'primary', '2026-03-01'),
('tk-luxe-onboard-t2', 'u-1772494615439', 'primary', '2026-03-09'),
('tk-luxe-onboard-t3', 'u-1772494615439', 'primary', '2026-03-11'),
('tk-luxe-onboard-t4', 'u-1772494615439', 'primary', '2026-03-12'),
('tk-luxe-onboard-t5', 'u-1772494665671', 'primary', '2026-03-03'),
('tk-luxe-onboard-t6', 'u-1772494665671', 'primary', '2026-03-09'),
('tk-luxe-onboard-t7', 'u-1772494665671', 'primary', '2026-03-10'),
('tk-luxe-onboard-t8', 'u-1772494684671', 'primary', '2026-03-02'),
('tk-luxe-onboard-t9', 'u-1772494684671', 'primary', '2026-03-11'),

-- tk-zen-perf tasks
('tk-zen-perf-t0', 'u-1772494644989', 'primary', '2026-03-01'),
('tk-zen-perf-t1', 'u-1772494644989', 'primary', '2026-03-02'),
('tk-zen-perf-t2', 'u-1772494615439', 'primary', '2026-03-09'),
('tk-zen-perf-t3', 'u-1772494615439', 'primary', '2026-03-10'),
('tk-zen-perf-t4', 'u-1772494665671', 'primary', '2026-03-03'),
('tk-zen-perf-t5', 'u-1772494665671', 'primary', '2026-03-09'),

-- tk-aura-camp tasks
('tk-aura-camp-t0', 'admin-1', 'primary', '2026-03-10'),
('tk-aura-camp-t1', 'u-1772494615439', 'primary', '2026-03-11'),
('tk-aura-camp-t2', 'u-1772494615439', 'primary', '2026-03-12'),
('tk-aura-camp-t3', 'u-1772494615439', 'primary', '2026-03-12'),
('tk-aura-camp-t4', 'u-1772494665671', 'primary', '2026-03-12'),
('tk-aura-camp-t5', 'u-1772494665671', 'primary', '2026-03-13'),
('tk-aura-camp-t6', 'u-1772494665671', 'primary', '2026-03-13'),
('tk-aura-camp-t7', 'u-1772494684671', 'primary', '2026-03-12'),
('tk-aura-camp-t8', 'u-1772494684671', 'primary', '2026-03-13'),

-- tk-bloom-status tasks
('tk-bloom-status-t0', 'u-1772494644989', 'primary', '2026-03-09'),
('tk-bloom-status-t1', 'u-1772494615439', 'primary', '2026-03-09'),
('tk-bloom-status-t2', 'u-1772494665671', 'primary', '2026-03-09'),
('tk-bloom-status-t3', 'u-1772494665671', 'primary', '2026-03-09'),

-- tk-pure-ghl tasks
('tk-pure-ghl-t0', 'admin-1', 'primary', '2026-03-10'),
('tk-pure-ghl-t1', 'u-1772494665671', 'primary', '2026-03-11'),
('tk-pure-ghl-t2', 'u-1772494665671', 'primary', '2026-03-12'),
('tk-pure-ghl-t3', 'u-1772494665671', 'primary', '2026-03-12'),
('tk-pure-ghl-t4', 'u-1772494665671', 'primary', '2026-03-13'),
('tk-pure-ghl-t5', 'u-1772494615439', 'primary', '2026-03-13'),

-- tk-zen-avail tasks
('tk-zen-avail-t0', 'u-1772494644989', 'primary', '2026-03-10'),
('tk-zen-avail-t1', 'u-1772494615439', 'primary', '2026-03-10'),
('tk-zen-avail-t2', 'u-1772494665671', 'primary', '2026-03-10'),

-- tk-glow-pause tasks
('tk-glow-pause-t0', 'u-1772494644989', 'primary', '2026-03-07'),
('tk-glow-pause-t1', 'u-1772494665671', 'primary', '2026-03-07'),
('tk-glow-pause-t2', 'u-1772494665671', 'primary', '2026-03-09'),
('tk-glow-pause-t3', 'u-1772494684671', 'primary', '2026-03-09'),

-- Completed ticket assignments
('tk-rad-done-t0', 'admin-1', 'primary', '2026-02-10'),
('tk-rad-done-t1', 'u-1772494615439', 'primary', '2026-02-11'),
('tk-rad-done-t2', 'u-1772494615439', 'primary', '2026-02-12'),
('tk-rad-done-t3', 'u-1772494615439', 'primary', '2026-02-13'),
('tk-rad-done-t4', 'u-1772494665671', 'primary', '2026-02-14'),
('tk-rad-done-t5', 'u-1772494665671', 'primary', '2026-02-15'),
('tk-rad-done-t6', 'u-1772494665671', 'primary', '2026-02-18'),
('tk-rad-done-t7', 'u-1772494684671', 'primary', '2026-02-11'),
('tk-rad-done-t8', 'u-1772494684671', 'primary', '2026-02-11'),

('tk-ser-done-t0', 'u-1772494644989', 'primary', '2026-02-15'),
('tk-ser-done-t1', 'u-1772494615439', 'primary', '2026-02-16'),
('tk-ser-done-t2', 'u-1772494615439', 'primary', '2026-02-17'),
('tk-ser-done-t3', 'u-1772494615439', 'primary', '2026-02-18'),
('tk-ser-done-t4', 'u-1772494665671', 'primary', '2026-02-19'),
('tk-ser-done-t5', 'u-1772494665671', 'primary', '2026-02-20'),
('tk-ser-done-t6', 'u-1772494665671', 'primary', '2026-02-21'),
('tk-ser-done-t7', 'u-1772494684671', 'primary', '2026-02-16'),
('tk-ser-done-t8', 'u-1772494684671', 'primary', '2026-02-16'),

('tk-zen-bdone-t0', 'u-1772494644989', 'primary', '2026-02-05'),
('tk-zen-bdone-t1', 'u-1772494665671', 'primary', '2026-02-06'),
('tk-zen-bdone-t2', 'u-1772494665671', 'primary', '2026-02-06'),
('tk-zen-bdone-t3', 'u-1772494684671', 'primary', '2026-02-07'),
('tk-zen-bdone-t4', 'u-1772494684671', 'primary', '2026-02-07')
ON CONFLICT (task_id, user_id) DO NOTHING;

-- ─── 9. COMMENTS ───

INSERT INTO comments (ticket_id, user_id, text, created_at) VALUES
('tk-glow-camp', 'u-1772494615439', 'Landing page request sent to the design team. Should be ready by Wednesday.', '2026-03-03T14:30:00Z'),
('tk-glow-camp', 'u-1772494665671', 'Pixel installed and verified. Firing correctly on all conversion events.', '2026-03-04T11:30:00Z'),
('tk-glow-camp', 'u-1772494644989', 'Client confirmed they want to target women 28-55 in Miami metro area.', '2026-03-04T16:00:00Z'),
('tk-glow-camp', 'u-1772494615439', 'Working on creatives now. Will have 3 variations ready by tomorrow.', '2026-03-05T10:00:00Z'),

('tk-ser-budget', 'u-1772494644989', 'Client approved the budget increase. They saw a 3x ROAS last month.', '2026-03-02T15:30:00Z'),
('tk-ser-budget', 'u-1772494665671', 'Meta Ads budget updated from $4000 to $6000. Changes will take effect at midnight.', '2026-03-03T10:30:00Z'),

('tk-zen-perf', 'u-1772494615439', 'CPA went from $65 to $91 over the last 14 days. Audience fatigue likely.', '2026-03-01T09:00:00Z'),
('tk-zen-perf', 'u-1772494644989', 'Spoke with Dr. Patel. They confirmed arrival rate is also down 20%.', '2026-03-02T15:00:00Z'),
('tk-zen-perf', 'u-1772494665671', 'Pixel check complete — all events firing correctly. Issue is not tracking-related.', '2026-03-03T09:30:00Z'),
('tk-zen-perf', 'u-1772494615439', 'Testing new lookalike audience based on top 5% customers. Will report results in 48h.', '2026-03-04T11:00:00Z'),

('tk-luxe-onboard', 'admin-1', 'Great onboarding call with Diana. She wants Express LED as the hero offer.', '2026-03-01T10:30:00Z'),
('tk-luxe-onboard', 'u-1772494665671', 'Salesforce CRM set up. Lead routing configured for NYC timezone.', '2026-03-03T14:30:00Z'),
('tk-luxe-onboard', 'u-1772494684671', 'Contract signed. Monthly billing of $1500 starting March 15.', '2026-03-02T09:30:00Z'),

('tk-glow-pause', 'u-1772494644989', 'Jizza confirmed with Sarah — booking system vendor is working on a fix. ETA 24-48h.', '2026-03-07T08:20:00Z'),
('tk-glow-pause', 'u-1772494665671', 'All 3 active campaigns paused. Documented current state and budgets.', '2026-03-07T08:45:00Z'),

('tk-rad-price', 'admin-1', 'Michelle asked for a March-only promo price of $99. Will revert to $129 in April.', '2026-03-04T10:30:00Z'),

('tk-bloom-status', 'u-1772494644989', 'Ashley confirmed she will be away March 15-30. Resume service April 1.', '2026-03-04T09:30:00Z');

-- ─── 10. ACTIVITY LOG ───

INSERT INTO activity_log (ticket_id, user_id, action, created_at) VALUES
('tk-glow-camp', 'u-1772494615439', 'Created New Campaign ticket', '2026-03-03T09:00:00Z'),
('tk-glow-camp', 'u-1772494644989', 'Completed task: Notify AM and TL', '2026-03-03T10:00:00Z'),
('tk-glow-camp', 'u-1772494615439', 'Completed task: Request landing page', '2026-03-03T14:00:00Z'),
('tk-glow-camp', 'u-1772494665671', 'Completed task: Pixel & tracking setup', '2026-03-04T11:00:00Z'),
('tk-glow-camp', 'u-1772494684671', 'Completed task: Budget allocation setup', '2026-03-04T09:00:00Z'),

('tk-rad-price', 'admin-1', 'Created Campaign Price Change ticket', '2026-03-04T10:00:00Z'),

('tk-ser-budget', 'u-1772494644989', 'Created Budget Change ticket', '2026-03-02T14:00:00Z'),
('tk-ser-budget', 'u-1772494644989', 'Completed task: Approve budget change', '2026-03-02T15:00:00Z'),
('tk-ser-budget', 'u-1772494665671', 'Completed task: Adjust Meta Ads budget', '2026-03-03T10:00:00Z'),

('tk-luxe-onboard', 'admin-1', 'Created New Spa ticket', '2026-02-28T11:00:00Z'),
('tk-luxe-onboard', 'admin-1', 'Completed task: Client onboarding call', '2026-03-01T10:00:00Z'),
('tk-luxe-onboard', 'admin-1', 'Completed task: Assign team members', '2026-03-01T11:00:00Z'),
('tk-luxe-onboard', 'u-1772494665671', 'Completed task: CRM setup (Salesforce)', '2026-03-03T14:00:00Z'),
('tk-luxe-onboard', 'u-1772494684671', 'Completed task: Contract & billing setup', '2026-03-02T09:00:00Z'),

('tk-zen-perf', 'u-1772494615439', 'Created Spa Performance Issues ticket', '2026-03-01T08:00:00Z'),
('tk-zen-perf', 'u-1772494644989', 'Completed task: Review performance data', '2026-03-01T10:00:00Z'),
('tk-zen-perf', 'u-1772494644989', 'Completed task: Client performance call', '2026-03-02T14:00:00Z'),
('tk-zen-perf', 'u-1772494665671', 'Completed task: Check pixel & tracking', '2026-03-03T09:00:00Z'),

('tk-aura-camp', 'u-1772494615439', 'Created New Campaign ticket', '2026-03-05T15:00:00Z'),
('tk-bloom-status', 'u-1772494644989', 'Created Service Status Change ticket', '2026-03-04T09:00:00Z'),
('tk-pure-ghl', 'u-1772494665671', 'Created Campaign GHL Migration ticket', '2026-03-05T11:00:00Z'),
('tk-zen-avail', 'admin-1', 'Created Availability Change ticket', '2026-03-06T10:00:00Z'),

('tk-glow-pause', 'u-1772494644989', 'Created Ad Pause Request ticket', '2026-03-07T08:00:00Z'),
('tk-glow-pause', 'u-1772494644989', 'Completed task: Confirm pause with client', '2026-03-07T08:15:00Z'),
('tk-glow-pause', 'u-1772494665671', 'Completed task: Pause all active campaigns', '2026-03-07T08:30:00Z'),

('tk-rad-camp-done', 'u-1772494615439', 'Created New Campaign ticket', '2026-02-10T10:00:00Z'),
('tk-ser-camp-done', 'u-1772494615439', 'Created New Campaign ticket', '2026-02-15T14:00:00Z'),
('tk-zen-budget-done', 'admin-1', 'Created Budget Change ticket', '2026-02-05T09:00:00Z');
