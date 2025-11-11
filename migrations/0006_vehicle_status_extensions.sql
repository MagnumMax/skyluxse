-- SkyLuxse ERP 2.0 - Vehicle status extensions (10 Nov 2025)

alter type vehicle_status add value if not exists 'sold';
alter type vehicle_status add value if not exists 'service_car';
