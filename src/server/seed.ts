import { count } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  availabilityBlocks,
  bookings,
  bookingStatusLogs,
  driverDocuments,
  driverProfiles,
  payments,
  platformSettings,
  reviews,
  transactions,
  users,
  vehicleImages,
  vehicleOwners,
  vehicles,
} from '../db/schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runIdempotentSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runIdempotentSeed(): Promise<void> {
  const existingUsers = await db.select({ total: count() }).from(users);
  if (Number(existingUsers[0]?.total ?? 0) > 0) {
    return;
  }

  console.log('Seeding ProDrivers Lagos demo marketplace data...');

  await db
    .insert(platformSettings)
    .values({ key: 'commission_rate_pct', value: '10' })
    .onConflictDoNothing();

  const [
    adminUser,
    customerAdaeze,
    customerTobi,
    driverUserChinedu,
    driverUserTunde,
    driverUserAmaka,
    driverUserIbrahim,
    driverUserSegun,
    ownerUserEko,
    ownerUserIkoyi,
  ] = await db
    .insert(users)
    .values([
      {
        uid: 'demo-admin-adeoti',
        email: 'adeotiisrael2022@gmail.com',
        fullName: 'Israel Adeoti',
        phone: '+234 803 000 0001',
        role: 'ADMIN',
        isDemo: true,
      },
      {
        uid: 'demo-cust-adaeze',
        email: 'adaeze.eze@demo.prodrivers.ng',
        fullName: 'Adaeze Eze',
        phone: '+234 809 412 8890',
        role: 'CUSTOMER',
        isDemo: true,
      },
      {
        uid: 'demo-cust-tobi',
        email: 'tobi.adeyemi@demo.prodrivers.ng',
        fullName: 'Tobi Adeyemi',
        phone: '+234 812 553 2041',
        role: 'CUSTOMER',
        isDemo: true,
      },
      {
        uid: 'demo-driver-chinedu',
        email: 'chinedu.okafor@demo.prodrivers.ng',
        fullName: 'Chinedu Okafor',
        phone: '+234 803 771 1902',
        role: 'DRIVER',
        avatarUrl: '/src/assets/images/driver_chinedu_okafor_1795309128141.jpg',
        isDemo: true,
      },
      {
        uid: 'demo-driver-tunde',
        email: 'tunde.balogun@demo.prodrivers.ng',
        fullName: 'Tunde Balogun',
        phone: '+234 805 619 3320',
        role: 'DRIVER',
        avatarUrl: '/src/assets/images/driver_tunde_balogun_1795309128396.jpg',
        isDemo: true,
      },
      {
        uid: 'demo-driver-amaka',
        email: 'amaka.nwosu@demo.prodrivers.ng',
        fullName: 'Amaka Nwosu',
        phone: '+234 814 228 9411',
        role: 'DRIVER',
        avatarUrl: '/src/assets/images/driver_amaka_nwosu_1795309128080.jpg',
        isDemo: true,
      },
      {
        uid: 'demo-driver-ibrahim',
        email: 'ibrahim.musa@demo.prodrivers.ng',
        fullName: 'Ibrahim Musa',
        phone: '+234 802 904 1144',
        role: 'DRIVER',
        avatarUrl: '/src/assets/images/driver_ibrahim_musa_1795309128443.jpg',
        isDemo: true,
      },
      {
        uid: 'demo-driver-segun',
        email: 'segun.adebayo@demo.prodrivers.ng',
        fullName: 'Segun Adebayo',
        phone: '+234 818 331 5092',
        role: 'DRIVER',
        avatarUrl: '/src/assets/images/driver_tunde_balogun_1795309128396.jpg',
        isDemo: true,
      },
      {
        uid: 'demo-owner-eko',
        email: 'fleet@ekoexecutive.demo.ng',
        fullName: 'Babajide Sanwo (Eko Executive Fleet)',
        phone: '+234 700 356 3533',
        role: 'VEHICLE_OWNER',
        isDemo: true,
      },
      {
        uid: 'demo-owner-ikoyi',
        email: 'dispatch@ikoyimobility.demo.ng',
        fullName: 'Folake Coker (Ikoyi Mobility Partners)',
        phone: '+234 809 778 2100',
        role: 'VEHICLE_OWNER',
        isDemo: true,
      },
    ])
    .returning();

  const [driverChinedu, driverTunde, driverAmaka, driverIbrahim, driverSegun] =
    await db
      .insert(driverProfiles)
      .values([
        {
          userId: driverUserChinedu.id,
          fullName: 'Chinedu Okafor',
          photoUrl: '/src/assets/images/driver_chinedu_okafor_1795309128141.jpg',
          location: 'Victoria Island, Lagos',
          serviceAreas: ['Victoria Island', 'Ikoyi', 'Lekki Phase 1', 'Eko Atlantic'],
          yearsExperience: 9,
          bio: 'LASDRI-certified executive chauffeur with nine years supporting banking executives, diplomatic missions, and multinational teams across Victoria Island and Ikoyi. Trained in defensive driving and discreet VIP protocol.',
          categories: ['Executive Chauffeur', 'Corporate Fleet', 'Airport Transfer'],
          languages: ['English', 'Igbo', 'Yoruba'],
          hourlyRateNgn: 4500,
          dailyRateNgn: 28000,
          weeklyRateNgn: 165000,
          monthlyRateNgn: 580000,
          ratingAvg: '4.95',
          totalTrips: 312,
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          isDemo: true,
        },
        {
          userId: driverUserTunde.id,
          fullName: 'Tunde Balogun',
          photoUrl: '/src/assets/images/driver_tunde_balogun_1795309128396.jpg',
          location: 'Ikeja GRA, Lagos',
          serviceAreas: ['Ikeja GRA', 'Murtala Muhammed Airport', 'Maryland', 'Victoria Island'],
          yearsExperience: 11,
          bio: 'Senior corporate & airport protocol driver specialising in punctual MMA2/MMIA pickups, Mainland-to-Island executive commutes, and multi-stop business itineraries.',
          categories: ['Airport Transfer', 'Corporate Fleet', 'Executive Chauffeur'],
          languages: ['English', 'Yoruba', 'Pidgin'],
          hourlyRateNgn: 4000,
          dailyRateNgn: 25000,
          weeklyRateNgn: 148000,
          monthlyRateNgn: 520000,
          ratingAvg: '4.88',
          totalTrips: 428,
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          isDemo: true,
        },
        {
          userId: driverUserAmaka.id,
          fullName: 'Amaka Nwosu',
          photoUrl: '/src/assets/images/driver_amaka_nwosu_1795309128080.jpg',
          location: 'Lekki Phase 1, Lagos',
          serviceAreas: ['Lekki Phase 1', 'Victoria Island', 'Ikoyi', 'Oniru'],
          yearsExperience: 7,
          bio: 'Poised corporate and family chauffeur known for spotless vehicle etiquette, calm route navigation across Lekki–Epe corridor, and reliable school/executive schedules.',
          categories: ['Executive Chauffeur', 'Special Events', 'Corporate Fleet'],
          languages: ['English', 'Igbo'],
          hourlyRateNgn: 4200,
          dailyRateNgn: 26500,
          weeklyRateNgn: 155000,
          monthlyRateNgn: 540000,
          ratingAvg: '4.92',
          totalTrips: 215,
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          isDemo: true,
        },
        {
          userId: driverUserIbrahim.id,
          fullName: 'Ibrahim Musa',
          photoUrl: '/src/assets/images/driver_ibrahim_musa_1795309128443.jpg',
          location: 'Ikoyi, Lagos',
          serviceAreas: ['Ikoyi', 'Victoria Island', 'Ibadan', 'Abeokuta'],
          yearsExperience: 10,
          bio: 'Long-distance intercity and diplomatic convoy specialist experienced on Lagos–Ibadan, Lagos–Abeokuta, and South-West highway corridors with full defensive certification.',
          categories: ['Intercity', 'Protocol & VIP', 'SUV Specialist'],
          languages: ['English', 'Hausa', 'Yoruba'],
          hourlyRateNgn: 4800,
          dailyRateNgn: 32000,
          weeklyRateNgn: 190000,
          monthlyRateNgn: 660000,
          ratingAvg: '4.90',
          totalTrips: 274,
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          isDemo: true,
        },
        {
          userId: driverUserSegun.id,
          fullName: 'Segun Adebayo',
          photoUrl: '/src/assets/images/driver_tunde_balogun_1795309128396.jpg',
          location: 'Yaba, Lagos',
          serviceAreas: ['Yaba', 'Surulere', 'Ikeja'],
          yearsExperience: 5,
          bio: 'Experienced corporate shuttle and private sedan driver currently completing LASDRI and background verification checks.',
          categories: ['Corporate Fleet', 'Daily Commute'],
          languages: ['English', 'Yoruba'],
          hourlyRateNgn: 3200,
          dailyRateNgn: 20000,
          weeklyRateNgn: 120000,
          monthlyRateNgn: 410000,
          ratingAvg: '4.70',
          totalTrips: 14,
          verificationStatus: 'PENDING',
          availabilityStatus: 'AVAILABLE',
          isDemo: true,
        },
      ])
      .returning();

  await db.insert(driverDocuments).values([
    {
      driverId: driverChinedu.id,
      docType: 'DRIVERS_LICENSE',
      documentNumber: 'FRSC-LAG-8824109',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      driverId: driverChinedu.id,
      docType: 'LASDRI_CERT',
      documentNumber: 'LASDRI-2025-4410',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      driverId: driverChinedu.id,
      docType: 'NIN_ID',
      documentNumber: 'NIN-***-9012',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      driverId: driverTunde.id,
      docType: 'DRIVERS_LICENSE',
      documentNumber: 'FRSC-IKJ-5520193',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      driverId: driverTunde.id,
      docType: 'LASDRI_CERT',
      documentNumber: 'LASDRI-2025-1192',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      driverId: driverAmaka.id,
      docType: 'DRIVERS_LICENSE',
      documentNumber: 'FRSC-LKK-3301842',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      driverId: driverAmaka.id,
      docType: 'LASDRI_CERT',
      documentNumber: 'LASDRI-2026-0831',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      driverId: driverIbrahim.id,
      docType: 'DRIVERS_LICENSE',
      documentNumber: 'FRSC-IKY-7741290',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
    {
      driverId: driverSegun.id,
      docType: 'DRIVERS_LICENSE',
      documentNumber: 'FRSC-YBA-1940221',
      status: 'PENDING',
    },
  ]);

  const [ownerEko, ownerIkoyi] = await db
    .insert(vehicleOwners)
    .values([
      {
        userId: ownerUserEko.id,
        companyName: 'Eko Executive Fleet Ltd',
        location: 'Victoria Island, Lagos',
        contactPhone: '+234 700 356 3533',
        verificationStatus: 'VERIFIED',
      },
      {
        userId: ownerUserIkoyi.id,
        companyName: 'Ikoyi Mobility Partners',
        location: 'Ikoyi, Lagos',
        contactPhone: '+234 809 778 2100',
        verificationStatus: 'VERIFIED',
      },
    ])
    .returning();

  const [
    vRangeRover,
    vMercedesE300,
    vCorolla,
    vPrado,
    vVClass,
    vHiaceBus,
    vPendingLexus,
  ] = await db
    .insert(vehicles)
    .values([
      {
        ownerId: ownerEko.id,
        make: 'Land Rover',
        model: 'Range Rover Autobiography',
        year: 2024,
        category: 'LUXURY',
        transmission: 'AUTOMATIC',
        fuelType: 'Petrol',
        seats: 5,
        location: 'Victoria Island, Lagos',
        plateNumber: 'LND-482-EV',
        description:
          'Flagship long-wheelbase Range Rover Autobiography maintained to diplomatic standards. Features rear executive seating, dual-zone climate control, and tinted privacy glass for Lagos Island & airport transfers.',
        features: [
          'Executive Rear Lounge',
          'Dual-Zone Climate AC',
          'Panoramic Roof',
          'In-Car Wi-Fi & USB-C',
          'Comprehensive Insurance',
        ],
        requirements: [
          'Chauffeur-driven only for Victoria Island & Ikoyi bookings',
          'Valid government-issued ID required at dispatch',
          '12-hour daily operational window (extra hours billed pro-rata)',
        ],
        dailyRateNgn: 220000,
        weeklyRateNgn: 1350000,
        monthlyRateNgn: 4800000,
        chauffeurSurchargeDailyNgn: 25000,
        allowsSelfDrive: false,
        allowsChauffeur: true,
        approvalStatus: 'APPROVED',
        availabilityStatus: 'AVAILABLE',
        primaryImageUrl: '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg',
        isDemo: true,
      },
      {
        ownerId: ownerEko.id,
        make: 'Mercedes-Benz',
        model: 'E300 AMG Line',
        year: 2023,
        category: 'SEDAN',
        transmission: 'AUTOMATIC',
        fuelType: 'Petrol',
        seats: 5,
        location: 'Ikoyi, Lagos',
        plateNumber: 'IKY-219-MB',
        description:
          'Refined executive sedan ideal for corporate boardroom visits, hotel transfers, and client hospitality across Ikoyi and Victoria Island.',
        features: [
          'Leather Interior',
          'Apple CarPlay',
          'Rear Sunshades',
          'Comprehensive Insurance',
        ],
        requirements: [
          'Valid FRSC driver’s licence for self-drive option',
          'Refundable caution deposit handled upon vehicle inspection',
        ],
        dailyRateNgn: 135000,
        weeklyRateNgn: 820000,
        monthlyRateNgn: 2950000,
        chauffeurSurchargeDailyNgn: 20000,
        allowsSelfDrive: true,
        allowsChauffeur: true,
        approvalStatus: 'APPROVED',
        availabilityStatus: 'AVAILABLE',
        primaryImageUrl: '/src/assets/images/vehicle_exec_sedan_1795309126661.jpg',
        isDemo: true,
      },
      {
        ownerId: ownerIkoyi.id,
        make: 'Toyota',
        model: 'Corolla SE',
        year: 2023,
        category: 'ECONOMY',
        transmission: 'AUTOMATIC',
        fuelType: 'Petrol',
        seats: 5,
        location: 'Ikeja GRA, Lagos',
        plateNumber: 'IKJ-704-TC',
        description:
          'Fuel-efficient, icy-AC modern compact sedan ideal for daily Lagos commutes, business errands, and flexible self-drive or chauffeur bookings.',
        features: [
          'Fuel Efficient 2.0L',
          'Reverse Camera',
          'Bluetooth Audio',
          'Full AC',
        ],
        requirements: [
          'Minimum 23 years old with valid Nigerian driver’s licence (self-drive)',
          'Fuel policy: Return at same fuel level',
        ],
        dailyRateNgn: 55000,
        weeklyRateNgn: 340000,
        monthlyRateNgn: 1250000,
        chauffeurSurchargeDailyNgn: 15000,
        allowsSelfDrive: true,
        allowsChauffeur: true,
        approvalStatus: 'APPROVED',
        availabilityStatus: 'AVAILABLE',
        primaryImageUrl: '/src/assets/images/vehicle_economy_compact_1795309127763.jpg',
        isDemo: true,
      },
      {
        ownerId: ownerIkoyi.id,
        make: 'Toyota',
        model: 'Land Cruiser Prado VX',
        year: 2023,
        category: 'SUV',
        transmission: 'AUTOMATIC',
        fuelType: 'Petrol',
        seats: 7,
        location: 'Lekki Phase 1, Lagos',
        plateNumber: 'LKK-910-PR',
        description:
          'Rugged yet refined 7-seater SUV built for Lagos Island, Lekki–Epe expressway, and intercity Southwest trips with generous luggage capacity.',
        features: [
          '7-Seat Configuration',
          '4WD Terrain Control',
          'Dual-Zone AC',
          'Roof Rails',
        ],
        requirements: [
          'Valid ID required prior to key handover',
          'Intercity clearance available for Ibadan, Abeokuta & Benin',
        ],
        dailyRateNgn: 165000,
        weeklyRateNgn: 990000,
        monthlyRateNgn: 3600000,
        chauffeurSurchargeDailyNgn: 20000,
        allowsSelfDrive: true,
        allowsChauffeur: true,
        approvalStatus: 'APPROVED',
        availabilityStatus: 'AVAILABLE',
        primaryImageUrl: '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg',
        isDemo: true,
      },
      {
        ownerId: ownerEko.id,
        make: 'Mercedes-Benz',
        model: 'V-Class V250 Avantgarde',
        year: 2023,
        category: 'VAN',
        transmission: 'AUTOMATIC',
        fuelType: 'Diesel',
        seats: 7,
        location: 'Victoria Island, Lagos',
        plateNumber: 'EKO-512-VC',
        description:
          'Executive 7-passenger conference van with face-to-face captain seats, ideal for C-suite delegations, airport arrivals, and diplomatic roadshows.',
        features: [
          'Captain Lounge Seating',
          'Sliding Electric Doors',
          'Power Outlets',
          'Privacy Glass',
        ],
        requirements: [
          'Chauffeur-driven only',
          'Flight number recommended for MMIA airport pickups',
        ],
        dailyRateNgn: 185000,
        weeklyRateNgn: 1120000,
        monthlyRateNgn: 4100000,
        chauffeurSurchargeDailyNgn: 22000,
        allowsSelfDrive: false,
        allowsChauffeur: true,
        approvalStatus: 'APPROVED',
        availabilityStatus: 'AVAILABLE',
        primaryImageUrl: '/src/assets/images/vehicle_executive_van_1795309127419.jpg',
        isDemo: true,
      },
      {
        ownerId: ownerIkoyi.id,
        make: 'Toyota',
        model: 'Hiace Executive Shuttle',
        year: 2022,
        category: 'BUS',
        transmission: 'MANUAL',
        fuelType: 'Petrol',
        seats: 14,
        location: 'Yaba, Lagos',
        plateNumber: 'YBA-334-HS',
        description:
          'High-roof 14-seater corporate and event shuttle bus with strong rear cabin cooling, well-suited for conferences, weddings, and team offsites.',
        features: [
          '14 Reclining Seats',
          'Rear Cabin AC',
          'PA Microphone Ready',
          'Large Luggage Bay',
        ],
        requirements: [
          'Chauffeur-driven only',
          'Advance route itinerary required for multi-stop events',
        ],
        dailyRateNgn: 115000,
        weeklyRateNgn: 690000,
        monthlyRateNgn: 2450000,
        chauffeurSurchargeDailyNgn: 18000,
        allowsSelfDrive: false,
        allowsChauffeur: true,
        approvalStatus: 'APPROVED',
        availabilityStatus: 'AVAILABLE',
        primaryImageUrl: '/src/assets/images/vehicle_executive_van_1795309127419.jpg',
        isDemo: true,
      },
      {
        ownerId: ownerIkoyi.id,
        make: 'Lexus',
        model: 'RX 350 F-Sport',
        year: 2024,
        category: 'SUV',
        transmission: 'AUTOMATIC',
        fuelType: 'Petrol',
        seats: 5,
        location: 'Ikoyi, Lagos',
        plateNumber: 'IKY-881-LX',
        description:
          'Newly onboarded 2024 Lexus RX 350 F-Sport awaiting ProDrivers fleet safety inspection and admin approval.',
        features: ['Panoramic Roof', 'Mark Levinson Audio', 'Adaptive Cruise'],
        requirements: ['Chauffeur or vetted self-drive'],
        dailyRateNgn: 150000,
        weeklyRateNgn: 920000,
        monthlyRateNgn: 3300000,
        chauffeurSurchargeDailyNgn: 20000,
        allowsSelfDrive: true,
        allowsChauffeur: true,
        approvalStatus: 'PENDING',
        availabilityStatus: 'AVAILABLE',
        primaryImageUrl: '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg',
        isDemo: true,
      },
    ])
    .returning();

  await db.insert(vehicleImages).values([
    {
      vehicleId: vRangeRover.id,
      imageUrl: '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg',
      caption: 'Exterior three-quarter profile',
      sortOrder: 0,
    },
    {
      vehicleId: vRangeRover.id,
      imageUrl: '/src/assets/images/hero_lagos_chauffeur_1795309126635.jpg',
      caption: 'Victoria Island executive arrival service',
      sortOrder: 1,
    },
    {
      vehicleId: vMercedesE300.id,
      imageUrl: '/src/assets/images/vehicle_exec_sedan_1795309126661.jpg',
      caption: 'Mercedes-Benz E300 front exterior',
      sortOrder: 0,
    },
    {
      vehicleId: vCorolla.id,
      imageUrl: '/src/assets/images/vehicle_economy_compact_1795309127763.jpg',
      caption: 'Pearl white Toyota Corolla SE',
      sortOrder: 0,
    },
    {
      vehicleId: vPrado.id,
      imageUrl: '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg',
      caption: 'SUV exterior view',
      sortOrder: 0,
    },
    {
      vehicleId: vVClass.id,
      imageUrl: '/src/assets/images/vehicle_executive_van_1795309127419.jpg',
      caption: 'Executive terminal arrival',
      sortOrder: 0,
    },
    {
      vehicleId: vHiaceBus.id,
      imageUrl: '/src/assets/images/vehicle_executive_van_1795309127419.jpg',
      caption: 'Corporate shuttle configuration',
      sortOrder: 0,
    },
    {
      vehicleId: vPendingLexus.id,
      imageUrl: '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg',
      caption: 'Pending inspection photo',
      sortOrder: 0,
    },
  ]);

  const now = new Date();
  const pastStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const pastEnd = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const past2Start = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const past2End = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const futureStart = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const future2Start = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const future2End = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [bCompleted1, bCompleted2, bConfirmed, bAwaiting] = await db
    .insert(bookings)
    .values([
      {
        bookingCode: 'PD-8841LA',
        customerId: customerAdaeze.id,
        driverId: driverChinedu.id,
        vehicleId: vMercedesE300.id,
        serviceType: 'CORPORATE',
        rentalOption: 'CHAUFFEUR',
        durationUnit: 'DAILY',
        durationCount: 2,
        startDate: pastStart,
        endDate: pastEnd,
        pickupLocation: 'Eko Hotel & Suites, Victoria Island',
        destination: 'Ikoyi Links Road',
        customerName: 'Adaeze Eze',
        customerPhone: '+234 809 412 8890',
        customerEmail: 'adaeze.eze@demo.prodrivers.ng',
        subtotalNgn: 326000,
        platformFeeNgn: 32600,
        totalAmountNgn: 358600,
        status: 'COMPLETED',
        driverDecision: 'ACCEPTED',
        ownerDecision: 'ACCEPTED',
        isDemo: true,
      },
      {
        bookingCode: 'PD-9104MM',
        customerId: customerTobi.id,
        driverId: driverTunde.id,
        vehicleId: null,
        serviceType: 'AIRPORT_TRANSFER',
        rentalOption: 'DRIVER_ONLY',
        durationUnit: 'DAILY',
        durationCount: 1,
        startDate: past2Start,
        endDate: past2End,
        pickupLocation: 'Murtala Muhammed International Airport, Ikeja',
        destination: 'Admiralty Way, Lekki Phase 1',
        customerName: 'Tobi Adeyemi',
        customerPhone: '+234 812 553 2041',
        customerEmail: 'tobi.adeyemi@demo.prodrivers.ng',
        subtotalNgn: 33000,
        platformFeeNgn: 3300,
        totalAmountNgn: 36300,
        status: 'COMPLETED',
        driverDecision: 'ACCEPTED',
        ownerDecision: null,
        isDemo: true,
      },
      {
        bookingCode: 'PD-3012VI',
        customerId: customerAdaeze.id,
        driverId: driverAmaka.id,
        vehicleId: vRangeRover.id,
        serviceType: 'CHAUFFEUR_CAR',
        rentalOption: 'CHAUFFEUR',
        durationUnit: 'DAILY',
        durationCount: 2,
        startDate: futureStart,
        endDate: futureEnd,
        pickupLocation: 'Bourdillon Road, Ikoyi',
        destination: 'Victoria Island Financial District',
        customerName: 'Adaeze Eze',
        customerPhone: '+234 809 412 8890',
        customerEmail: 'adaeze.eze@demo.prodrivers.ng',
        subtotalNgn: 493000,
        platformFeeNgn: 49300,
        totalAmountNgn: 542300,
        status: 'CONFIRMED',
        driverDecision: 'ACCEPTED',
        ownerDecision: 'ACCEPTED',
        isDemo: true,
      },
      {
        bookingCode: 'PD-4490LK',
        customerId: customerTobi.id,
        driverId: null,
        vehicleId: vCorolla.id,
        serviceType: 'CAR_RENTAL',
        rentalOption: 'SELF_DRIVE',
        durationUnit: 'DAILY',
        durationCount: 1,
        startDate: future2Start,
        endDate: future2End,
        pickupLocation: 'Ikeja GRA, Lagos',
        destination: 'Lagos Mainland',
        customerName: 'Tobi Adeyemi',
        customerPhone: '+234 812 553 2041',
        customerEmail: 'tobi.adeyemi@demo.prodrivers.ng',
        subtotalNgn: 55000,
        platformFeeNgn: 5500,
        totalAmountNgn: 60500,
        status: 'AWAITING_PAYMENT',
        driverDecision: null,
        ownerDecision: 'PENDING',
        isDemo: true,
      },
    ])
    .returning();

  await db.insert(bookingStatusLogs).values([
    {
      bookingId: bCompleted1.id,
      fromStatus: 'CONFIRMED',
      toStatus: 'COMPLETED',
      changedByUserId: adminUser.id,
      note: 'Demo corporate trip completed.',
    },
    {
      bookingId: bCompleted2.id,
      fromStatus: 'CONFIRMED',
      toStatus: 'COMPLETED',
      changedByUserId: adminUser.id,
      note: 'Demo airport pickup completed.',
    },
    {
      bookingId: bConfirmed.id,
      fromStatus: 'AWAITING_PAYMENT',
      toStatus: 'CONFIRMED',
      changedByUserId: customerAdaeze.id,
      note: 'Demo payment verified.',
    },
    {
      bookingId: bAwaiting.id,
      fromStatus: null,
      toStatus: 'AWAITING_PAYMENT',
      changedByUserId: customerTobi.id,
      note: 'Demo self-drive booking awaiting payment.',
    },
  ]);

  const [p1, p2, p3] = await db
    .insert(payments)
    .values([
      {
        bookingId: bCompleted1.id,
        reference: 'PSK_DEMO_8841LA',
        provider: 'PAYSTACK',
        amountNgn: 358600,
        status: 'PAID',
        channel: 'card',
        paidAt: pastStart,
      },
      {
        bookingId: bCompleted2.id,
        reference: 'PSK_DEMO_9104MM',
        provider: 'PAYSTACK',
        amountNgn: 36300,
        status: 'PAID',
        channel: 'bank_transfer',
        paidAt: past2Start,
      },
      {
        bookingId: bConfirmed.id,
        reference: 'PSK_DEMO_3012VI',
        provider: 'PAYSTACK',
        amountNgn: 542300,
        status: 'PAID',
        channel: 'card',
        paidAt: now,
      },
    ])
    .returning();

  await db.insert(transactions).values([
    {
      paymentId: p1.id,
      bookingId: bCompleted1.id,
      userId: customerAdaeze.id,
      type: 'CUSTOMER_PAYMENT',
      amountNgn: 358600,
      reference: p1.reference,
      description: 'Demo payment for PD-8841LA',
    },
    {
      paymentId: p2.id,
      bookingId: bCompleted2.id,
      userId: customerTobi.id,
      type: 'CUSTOMER_PAYMENT',
      amountNgn: 36300,
      reference: p2.reference,
      description: 'Demo payment for PD-9104MM',
    },
    {
      paymentId: p3.id,
      bookingId: bConfirmed.id,
      userId: customerAdaeze.id,
      type: 'CUSTOMER_PAYMENT',
      amountNgn: 542300,
      reference: p3.reference,
      description: 'Demo payment for PD-3012VI',
    },
  ]);

  await db.insert(reviews).values([
    {
      bookingId: bCompleted1.id,
      customerId: customerAdaeze.id,
      driverId: driverChinedu.id,
      vehicleId: vMercedesE300.id,
      rating: 5,
      comment:
        'Demo review: Chinedu arrived fifteen minutes ahead of our Victoria Island board meetings and navigated Lekki–Ikoyi traffic effortlessly.',
      isDemo: true,
    },
    {
      bookingId: bCompleted2.id,
      customerId: customerTobi.id,
      driverId: driverTunde.id,
      vehicleId: null,
      rating: 5,
      comment:
        'Demo review: Seamless late-evening pickup from Murtala Muhammed International Airport straight to Lekki Phase 1.',
      isDemo: true,
    },
  ]);

  await db.insert(availabilityBlocks).values([
    {
      targetType: 'DRIVER',
      targetId: driverIbrahim.id,
      startDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
      reason: 'Scheduled Intercity Charter',
    },
  ]);

  console.log('ProDrivers demo seed completed.');
}

// Allow direct CLI execution via `npx tsx src/server/seed.ts`
const invokedDirectly =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('seed.ts');

if (invokedDirectly) {
  ensureSeeded()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
