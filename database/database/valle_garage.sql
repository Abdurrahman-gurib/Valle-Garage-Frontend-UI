-- Valle Garage PostgreSQL seed for database valle_garage
-- Run after: npx prisma db push
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DELETE FROM "Notification";
DELETE FROM "GarageOperation";
DELETE FROM "Assessment";
DELETE FROM "InventoryItem";
DELETE FROM "Vehicle";
DELETE FROM "Transaction";
DELETE FROM "User";

INSERT INTO "User" ("id","name","email","passwordHash","role","isActive","createdAt","updatedAt") VALUES
(gen_random_uuid()::text,'Admin User','admin@vallepark.com',crypt('password123', gen_salt('bf', 10)),'ADMIN',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'Mechanic User','mechanic@vallepark.com',crypt('password123', gen_salt('bf', 10)),'MECHANIC',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'Store Keeper User','store@vallepark.com',crypt('password123', gen_salt('bf', 10)),'STORE_KEEPER',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT INTO "Transaction" ("id","transactionNo","type","status","title","supplierName","supplierEmail","customerName","startDate","expectedDeliveryDate","poNumber","amount","notes","createdById","createdAt","updatedAt") VALUES
(gen_random_uuid()::text,'TXN-0001','VEHICLE_ORDER','IN_PROGRESS','Customer Order - New Quad Build',NULL,NULL,'External Adventure Client',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '30 days','PO-CUST-001',450000.00,'Customer ordered a new quad to be assembled and tested.',(SELECT "id" FROM "User" WHERE "email"='admin@vallepark.com'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'TXN-0002','PART_PURCHASE','IN_PROGRESS','Reorder Drive Belts and Brake Pads','CFMOTO Supplier','supplier@example.com',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '14 days','PO-0002',78000.00,'Urgent reorder for low-stock workshop items.',(SELECT "id" FROM "User" WHERE "email"='admin@vallepark.com'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT INTO "Vehicle" ("id","plateNumber","vin","vehicleType","ownership","ownerName","companyName","deliveryPersonName","contactNumber","email","manufacturer","status","currentHourMeter","checkInDateTime","expectedDeliveryDate","notes","createdById","transactionId","createdAt","updatedAt") VALUES
(gen_random_uuid()::text,'CFM-1042','LCELV1Z42P6001042','Quad','INTERNAL','Vallé Internal Fleet',NULL,NULL,NULL,NULL,'CFMOTO','UNDER_REPAIR',1180,CURRENT_TIMESTAMP - INTERVAL '2 days',CURRENT_TIMESTAMP + INTERVAL '5 days','Brake issue reported after morning trail.',(SELECT "id" FROM "User" WHERE "email"='admin@vallepark.com'),NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'BUG-2201','BUGGY-VIN-2201','Buggy','INTERNAL','Vallé Internal Fleet',NULL,NULL,NULL,NULL,'CFMOTO','ACTIVE',820,NULL,NULL,'Ready for customer rides.',(SELECT "id" FROM "User" WHERE "email"='admin@vallepark.com'),NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'BUILD-3001','BUILD-VIN-3001','Quad','CUSTOMER_ORDER','External Adventure Client','Adventure Client Ltd','Kevin Delivery','+230 5123 4567','client@example.com','CFMOTO','BUILD_IN_PROGRESS',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '30 days','Vehicle created from customer purchase order.',(SELECT "id" FROM "User" WHERE "email"='admin@vallepark.com'),(SELECT "id" FROM "Transaction" WHERE "transactionNo"='TXN-0001'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT INTO "InventoryItem" ("id","sku","name","category","barcode","currentStock","reorderLevel","costPrice","sellingPrice","supplierName","supplierEmail","location","createdAt","updatedAt") VALUES
(gen_random_uuid()::text,'CF-OIL-221','Oil Filter CFMOTO','Service Parts','889102210',7,10,250.00,450.00,'CFMOTO Supplier','supplier@example.com','Quad Store',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'CF-BRK-110','Brake Pad Set','Brake System','889100110',34,12,850.00,1250.00,'CFMOTO Supplier','supplier@example.com','Buggy Bay',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'CF-BLT-501','Drive Belt','Transmission','889105501',4,8,2600.00,3800.00,'CFMOTO Supplier','supplier@example.com','Workshop',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'CF-SPK-330','Spark Plug','Engine Parts','889103330',58,20,150.00,290.00,'CFMOTO Supplier','supplier@example.com','CFMOTO Store',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT INTO "Assessment" ("id","ticketNo","vehicleId","mechanicId","status","issuesDetected","conclusion","requiredParts","photos","createdAt","updatedAt") VALUES
(gen_random_uuid()::text,'ASM-1001',(SELECT "id" FROM "Vehicle" WHERE "plateNumber"='CFM-1042'),(SELECT "id" FROM "User" WHERE "email"='mechanic@vallepark.com'),'READY_FOR_PARTS','Brake noise and weak stopping response.','Replace front brake pads and inspect brake fluid.','[{"partName":"Brake Pad Set","quantity":2}]','[]',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'ASM-1002',(SELECT "id" FROM "Vehicle" WHERE "plateNumber"='BUG-2201'),(SELECT "id" FROM "User" WHERE "email"='mechanic@vallepark.com'),'COMPLETED','Routine service due.','Oil and filter replacement completed.','[{"partName":"Oil Filter CFMOTO","quantity":1}]','[]',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT INTO "GarageOperation" ("id","processNo","vehicleId","assessmentId","processType","status","proceduresPerformed","partsUsed","mechanicId","checkInDateTime","startDateTime","laborHours","currentHourMeter","nextServiceDueAtHours","paymentDone","photos","createdAt","updatedAt") VALUES
(gen_random_uuid()::text,'PRC-501',(SELECT "id" FROM "Vehicle" WHERE "plateNumber"='CFM-1042'),(SELECT "id" FROM "Assessment" WHERE "ticketNo"='ASM-1001'),'REPAIR','IN_PROGRESS','Inspecting brake system and preparing vehicle for brake pad replacement.','[{"partName":"Brake Pad Set","quantity":2}]',(SELECT "id" FROM "User" WHERE "email"='mechanic@vallepark.com'),CURRENT_TIMESTAMP - INTERVAL '2 days',CURRENT_TIMESTAMP - INTERVAL '1 day',2.50,1180,1250,false,'[]',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'PRC-502',(SELECT "id" FROM "Vehicle" WHERE "plateNumber"='BUILD-3001'),NULL,'ASSEMBLY','PENDING','Customer vehicle build request waiting for assembly.','[]',(SELECT "id" FROM "User" WHERE "email"='mechanic@vallepark.com'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,NULL,0,50,false,'[]',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT INTO "Notification" ("id","title","message","role","isRead","createdAt") VALUES
(gen_random_uuid()::text,'Low Stock Alert','Drive Belt stock is below reorder level.','STORE_KEEPER',false,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'Parts Required','Assessment ASM-1001 requires parts issuance.','STORE_KEEPER',false,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'Garage Work Assigned','Garage operation PRC-501 is assigned to you.','MECHANIC',false,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'Vehicle Build Request','Customer vehicle BUILD-3001 is ready for assembly workflow.','MECHANIC',false,CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'Transaction Update','Transaction TXN-0001 is currently in progress.','ADMIN',false,CURRENT_TIMESTAMP);

SELECT 'User' AS table_name, COUNT(*) AS rows FROM "User"
UNION ALL SELECT 'Transaction', COUNT(*) FROM "Transaction"
UNION ALL SELECT 'Vehicle', COUNT(*) FROM "Vehicle"
UNION ALL SELECT 'InventoryItem', COUNT(*) FROM "InventoryItem"
UNION ALL SELECT 'Assessment', COUNT(*) FROM "Assessment"
UNION ALL SELECT 'GarageOperation', COUNT(*) FROM "GarageOperation"
UNION ALL SELECT 'Notification', COUNT(*) FROM "Notification";
