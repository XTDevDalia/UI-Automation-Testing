// @ts-check
import { test, expect } from '@playwright/test';

// Configuration
const baseURL =
  process.env.BASE_URL ||
  'https://dev.iactivateisc.com/account/devlogin';

const username =
  process.env.EMAIL ||
  'jayant.x.jhanwar@haleon.com';

const password =
  process.env.PASSWORD ||
  '123456';

const role =
  process.env.ROLE ||
  'HOAdmin';

const activityPlanningURL =
  'https://dev.iactivateisc.com/ActivityPlan/Index';

// ==========================================
// Dynamic Plan Name Generator
// ==========================================
function generatePlanName(prefix = 'TestPlan') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}_${random}`;
}

// ==========================================
// Next Month Calculator
// ==========================================
function getNextMonth() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const name = monthNames[next.getMonth()];
  const shortName = name.substring(0, 3);
  const number = next.getMonth() + 1;
  const year = next.getFullYear();

  return {
    name,
    shortName,
    number,
    year,
    monthYear: `${name} ${year}`,
  };
}

// ==========================================
// Expiry Date Calculator (Next Month, same day)
// ==========================================
function getExpiryDate() {
  const now = new Date();
  // Keep the same day of month if it exists in next month;
  // otherwise clamp to the last day of next month (e.g. Jan 31 -> Feb 28/29).
  const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
  const day = Math.min(now.getDate(), lastDayOfNextMonth);

  const expiry = new Date(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth(), day);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const yyyy = expiry.getFullYear();
  const mm = String(expiry.getMonth() + 1).padStart(2, '0');
  const dd = String(expiry.getDate()).padStart(2, '0');

  return {
    date: expiry,
    day: expiry.getDate(),
    dayPadded: dd,
    month: expiry.getMonth() + 1,
    monthPadded: mm,
    monthName: monthNames[expiry.getMonth()],
    monthShortName: monthNames[expiry.getMonth()].substring(0, 3),
    year: yyyy,
    // Common date string formats
    iso: `${yyyy}-${mm}-${dd}`,         // 2026-06-19
    ddmmyyyy: `${dd}/${mm}/${yyyy}`,     // 19/06/2026
    mmddyyyy: `${mm}/${dd}/${yyyy}`,     // 06/19/2026
    ddmmyyyyDash: `${dd}-${mm}-${yyyy}`, // 19-06-2026
    monthYear: `${monthNames[expiry.getMonth()]} ${yyyy}`,
  };
}

const planName = process.env.PLAN_NAME || generatePlanName('AutoPlan');
const nextMonth = getNextMonth();
const expiryDate = getExpiryDate();

test('Login successfully and navigate to Activity Planning page', async ({ page, context }) => {
  // Open login page
  await page.goto(baseURL, { waitUntil: 'networkidle' });

  // Fill Email
  await page.fill(
    'input[type="email"], input[name="Email"], input[placeholder*="email" i]',
    username
  );

  // Fill Password
  await page.fill(
    'input[type="password"], input[name="Password"], input[placeholder*="password" i]',
    password
  );

  // Select Role if dropdown exists
  const roleSelector = page.locator(
    'select, [role="combobox"], input[placeholder*="Role" i]'
  );

  if (await roleSelector.count()) {
    if (await roleSelector.first().isVisible().catch(() => false)) {
      await roleSelector.first().selectOption({ label: role }).catch(async () => {
        await roleSelector.first().selectOption(role);
      });
    }
  }

  // Click Login button
  await page.getByRole('button', { name: /login|submit|sign in/i }).click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/Dashboard/i);
  await page.waitForTimeout(2000);

  // ==========================================
  // Click on "Activity Plans" Main Menu
  // ==========================================
  const activityPlansMenu = page.getByRole('link', { name: /activity plans?/i });
  await expect(activityPlansMenu).toBeVisible({ timeout: 10000 });
  await activityPlansMenu.click();
  await page.waitForTimeout(1000);

  // ==========================================
  // Click on "Activity Planning" Sub Menu
  // ==========================================
  const activityPlanningSubMenu = page.getByRole('link', {
    name: /^Activity Planning$/i,
  });
  await expect(activityPlanningSubMenu).toBeVisible({ timeout: 10000 });
  await activityPlanningSubMenu.click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(activityPlanningURL);
  await expect(page).toHaveURL(/ActivityPlan\/Index/i);

  // ==========================================
  // Click on "Create New Plan" Button
  // ==========================================
  const createNewPlanBtn = page.getByRole('button', { name: /create new plan/i });
  const createNewPlanLink = page.getByRole('link', { name: /create new plan/i });

  const createNewPlanElement = (await createNewPlanBtn.count())
    ? createNewPlanBtn
    : createNewPlanLink;

  await expect(createNewPlanElement.first()).toBeVisible({ timeout: 10000 });
  await createNewPlanElement.first().click();
  await page.waitForLoadState('networkidle');

  // ==========================================
  // Enter Plan Name Dynamically
  // ==========================================
  console.log(`\n✨ Generated Plan Name: ${planName}`);

  const planNameInput = page.locator(
    [
      'input[name="PlanName" i]',
      'input[id*="PlanName" i]',
      'input[id*="plan_name" i]',
      'input[placeholder*="plan name" i]',
      'input[placeholder*="plan" i]',
      'input[aria-label*="plan name" i]',
      'input[name*="Name" i]',
    ].join(', ')
  );

  await expect(planNameInput.first()).toBeVisible({ timeout: 15000 });
  await planNameInput.first().click();
  await planNameInput.first().fill('');
  await planNameInput.first().fill(planName);
  await expect(planNameInput.first()).toHaveValue(planName);

  console.log(`✅ Plan Name "${planName}" entered successfully`);

  // ==========================================
  // Select Next Month from Dropdown
  // ==========================================
  console.log(`\n📅 Target Month: ${nextMonth.monthYear} (Month ${nextMonth.number})`);

  const monthDropdown = page.locator(
    [
      'select[name*="Month" i]',
      'select[id*="Month" i]',
      'select[name="month" i]',
      '[role="combobox"][name*="Month" i]',
      '[aria-label*="month" i]',
    ].join(', ')
  );

  await expect(monthDropdown.first()).toBeVisible({ timeout: 15000 });

  const tagName = await monthDropdown.first().evaluate((el) => el.tagName.toLowerCase());

  if (tagName === 'select') {
    const candidates = [
      nextMonth.name,
      nextMonth.shortName,
      String(nextMonth.number).padStart(2, '0'),
      String(nextMonth.number),
      nextMonth.monthYear,
    ];

    let selected = false;
    for (const candidate of candidates) {
      try {
        await monthDropdown.first().selectOption({ label: candidate });
        selected = true;
        console.log(`✅ Selected by label: "${candidate}"`);
        break;
      } catch (e) {
        try {
          await monthDropdown.first().selectOption({ value: candidate });
          selected = true;
          console.log(`✅ Selected by value: "${candidate}"`);
          break;
        } catch (e2) {
          // try next candidate
        }
      }
    }

    if (!selected) {
      throw new Error(
        `Could not select next month. Tried: ${candidates.join(', ')}.`
      );
    }
  } else {
    await monthDropdown.first().click();
    await page.waitForTimeout(500);

    const optionCandidates = [
      page.getByRole('option', { name: new RegExp(`^${nextMonth.name}$`, 'i') }),
      page.getByRole('option', { name: new RegExp(`^${nextMonth.shortName}$`, 'i') }),
      page.locator(`li:has-text("${nextMonth.name}")`),
      page.locator(`li:has-text("${nextMonth.shortName}")`),
      page.locator(`[role="option"]:has-text("${nextMonth.name}")`),
    ];

    let clicked = false;
    for (const opt of optionCandidates) {
      if (await opt.first().isVisible().catch(() => false)) {
        await opt.first().click();
        clicked = true;
        console.log(`✅ Selected "${nextMonth.name}" from custom dropdown`);
        break;
      }
    }

    if (!clicked) {
      throw new Error(
        `Could not find option "${nextMonth.name}" or "${nextMonth.shortName}" in custom dropdown.`
      );
    }
  }

  await page.waitForTimeout(1000);

  // ==========================================
  // Select "ESE Led" from Execution Type Dropdown
  // ==========================================
  const executionType = process.env.EXECUTION_TYPE || 'ESE Led';
  console.log(`\n⚙️  Target Execution Type: ${executionType}`);

  const executionTypeDropdown = page.locator(
    [
      'select[name*="ExecutionType" i]',
      'select[id*="ExecutionType" i]',
      'select[name*="Execution" i]',
      'select[id*="Execution" i]',
      '[role="combobox"][name*="Execution" i]',
      '[aria-label*="execution type" i]',
      '[aria-label*="execution" i]',
    ].join(', ')
  );

  await expect(executionTypeDropdown.first()).toBeVisible({ timeout: 15000 });

  const execTagName = await executionTypeDropdown
    .first()
    .evaluate((el) => el.tagName.toLowerCase());

  if (execTagName === 'select') {
    const execCandidates = [
      executionType,
      'ESE Led',
      'ESE-Led',
      'ESELed',
      'ese led',
      'ESE',
    ];

    let execSelected = false;
    for (const candidate of execCandidates) {
      try {
        await executionTypeDropdown.first().selectOption({ label: candidate });
        execSelected = true;
        console.log(`✅ Execution Type selected by label: "${candidate}"`);
        break;
      } catch (e) {
        try {
          await executionTypeDropdown.first().selectOption({ value: candidate });
          execSelected = true;
          console.log(`✅ Execution Type selected by value: "${candidate}"`);
          break;
        } catch (e2) {
          // try next candidate
        }
      }
    }

    if (!execSelected) {
      throw new Error(
        `Could not select "${executionType}". Tried: ${execCandidates.join(', ')}.`
      );
    }
  } else {
    await executionTypeDropdown.first().click();
    await page.waitForTimeout(500);

    const execOptionCandidates = [
      page.getByRole('option', { name: /^ESE\s*Led$/i }),
      page.getByRole('option', { name: /ESE\s*Led/i }),
      page.locator(`li:has-text("ESE Led")`),
      page.locator(`[role="option"]:has-text("ESE Led")`),
      page.locator(`div:has-text("ESE Led")`).last(),
    ];

    let execClicked = false;
    for (const opt of execOptionCandidates) {
      if (await opt.first().isVisible().catch(() => false)) {
        await opt.first().click();
        execClicked = true;
        console.log(`✅ Selected "ESE Led" from custom dropdown`);
        break;
      }
    }

    if (!execClicked) {
      throw new Error(
        `Could not find option "ESE Led" in execution type dropdown.`
      );
    }
  }

  await page.waitForTimeout(1000);

  // ==========================================
  // Select "Sensodyne Paste" from Brand Dropdown
  // ==========================================
  const brand = process.env.BRAND || 'Sensodyne Paste';
  console.log(`\n🏷️  Target Brand: ${brand}`);

  const brandDropdown = page.locator(
    [
      'select[name*="Brand" i]',
      'select[id*="Brand" i]',
      'select[name="brand" i]',
      '[role="combobox"][name*="Brand" i]',
      '[aria-label*="brand" i]',
    ].join(', ')
  );

  await expect(brandDropdown.first()).toBeVisible({ timeout: 15000 });

  const brandTagName = await brandDropdown
    .first()
    .evaluate((el) => el.tagName.toLowerCase());

  if (brandTagName === 'select') {
    const brandCandidates = [
      brand,
      'Sensodyne Paste',
      'Sensodyne-Paste',
      'SensodynePaste',
      'sensodyne paste',
      'SENSODYNE PASTE',
      'Sensodyne',
    ];

    let brandSelected = false;
    for (const candidate of brandCandidates) {
      try {
        await brandDropdown.first().selectOption({ label: candidate });
        brandSelected = true;
        console.log(`✅ Brand selected by label: "${candidate}"`);
        break;
      } catch (e) {
        try {
          await brandDropdown.first().selectOption({ value: candidate });
          brandSelected = true;
          console.log(`✅ Brand selected by value: "${candidate}"`);
          break;
        } catch (e2) {
          // try next candidate
        }
      }
    }

    if (!brandSelected) {
      throw new Error(
        `Could not select "${brand}". Tried: ${brandCandidates.join(', ')}.`
      );
    }
  } else {
    // Click to open the dropdown
    await brandDropdown.first().click();
    await page.waitForTimeout(500);

    // If it's a searchable dropdown, type to filter
    try {
      const searchInput = page.locator(
        'input[type="search"]:visible, [role="combobox"][aria-expanded="true"] input:visible, .select2-search__field:visible'
      );
      if (await searchInput.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await searchInput.first().fill('Sensodyne Paste');
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Not a searchable dropdown — proceed
    }

    const brandOptionCandidates = [
      page.getByRole('option', { name: /^Sensodyne\s*Paste$/i }),
      page.getByRole('option', { name: /Sensodyne\s*Paste/i }),
      page.locator(`li:has-text("Sensodyne Paste")`),
      page.locator(`[role="option"]:has-text("Sensodyne Paste")`),
      page.locator(`div:has-text("Sensodyne Paste")`).last(),
    ];

    let brandClicked = false;
    for (const opt of brandOptionCandidates) {
      if (await opt.first().isVisible().catch(() => false)) {
        await opt.first().click();
        brandClicked = true;
        console.log(`✅ Selected "Sensodyne Paste" from custom dropdown`);
        break;
      }
    }

    if (!brandClicked) {
      throw new Error(
        `Could not find option "Sensodyne Paste" in brand dropdown.`
      );
    }
  }

  await page.waitForTimeout(1000);

  // ==========================================
  // Select "Repair&Protect" from Dropdown (SKU/Variant/Sub-Brand)
  // ==========================================
  const variant = process.env.VARIANT || 'Repair&Protect';
  console.log(`\n🧪 Target Variant/SKU: ${variant}`);

  const variantDropdown = page.locator(
    [
      'select[name*="SKU" i]',
      'select[id*="SKU" i]',
      'select[name*="Variant" i]',
      'select[id*="Variant" i]',
      'select[name*="SubBrand" i]',
      'select[id*="SubBrand" i]',
      'select[name*="Sub_Brand" i]',
      'select[id*="Sub_Brand" i]',
      'select[name*="Product" i]',
      'select[id*="Product" i]',
      '[role="combobox"][name*="SKU" i]',
      '[role="combobox"][name*="Variant" i]',
      '[role="combobox"][name*="SubBrand" i]',
      '[aria-label*="variant" i]',
      '[aria-label*="sku" i]',
      '[aria-label*="sub brand" i]',
      '[aria-label*="sub-brand" i]',
      '[aria-label*="product" i]',
    ].join(', ')
  );

  await expect(variantDropdown.first()).toBeVisible({ timeout: 15000 });

  const variantTagName = await variantDropdown
    .first()
    .evaluate((el) => el.tagName.toLowerCase());

  if (variantTagName === 'select') {
    const variantCandidates = [
      variant,
      'Repair&Protect',
      'Repair & Protect',
      'Repair and Protect',
      'Repair-Protect',
      'RepairProtect',
      'repair&protect',
      'REPAIR&PROTECT',
    ];

    let variantSelected = false;
    for (const candidate of variantCandidates) {
      try {
        await variantDropdown.first().selectOption({ label: candidate });
        variantSelected = true;
        console.log(`✅ Variant selected by label: "${candidate}"`);
        break;
      } catch (e) {
        try {
          await variantDropdown.first().selectOption({ value: candidate });
          variantSelected = true;
          console.log(`✅ Variant selected by value: "${candidate}"`);
          break;
        } catch (e2) {
          // try next candidate
        }
      }
    }

    if (!variantSelected) {
      throw new Error(
        `Could not select "${variant}". Tried: ${variantCandidates.join(', ')}.`
      );
    }
  } else {
    // Click to open the dropdown
    await variantDropdown.first().click();
    await page.waitForTimeout(500);

    // If it's a searchable dropdown, type to filter
    try {
      const searchInput = page.locator(
        'input[type="search"]:visible, [role="combobox"][aria-expanded="true"] input:visible, .select2-search__field:visible'
      );
      if (await searchInput.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await searchInput.first().fill('Repair');
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Not a searchable dropdown — proceed
    }

    const variantOptionCandidates = [
      page.getByRole('option', { name: /^Repair\s*&\s*Protect$/i }),
      page.getByRole('option', { name: /Repair\s*&\s*Protect/i }),
      page.getByRole('option', { name: /Repair\s*and\s*Protect/i }),
      page.locator(`li:has-text("Repair&Protect")`),
      page.locator(`li:has-text("Repair & Protect")`),
      page.locator(`[role="option"]:has-text("Repair&Protect")`),
      page.locator(`[role="option"]:has-text("Repair & Protect")`),
      page.locator(`div:has-text("Repair&Protect")`).last(),
      page.locator(`div:has-text("Repair & Protect")`).last(),
    ];

    let variantClicked = false;
    for (const opt of variantOptionCandidates) {
      if (await opt.first().isVisible().catch(() => false)) {
        await opt.first().click();
        variantClicked = true;
        console.log(`✅ Selected "Repair&Protect" from custom dropdown`);
        break;
      }
    }

    if (!variantClicked) {
      throw new Error(
        `Could not find option "Repair&Protect" in variant dropdown.`
      );
    }
  }

  await page.waitForTimeout(1000);

  // ==========================================
  // Select Expiry Date (Next Month) from Date Picker
  // ==========================================
  console.log(
    `\n🗓️  Target Expiry Date: ${expiryDate.iso} ` +
    `(${expiryDate.day} ${expiryDate.monthName} ${expiryDate.year})`
  );

  const expiryDateInput = page.locator(
    [
      'input[name*="ExpiryDate" i]',
      'input[id*="ExpiryDate" i]',
      'input[name*="Expiry" i]',
      'input[id*="Expiry" i]',
      'input[name*="ExpiresOn" i]',
      'input[id*="ExpiresOn" i]',
      'input[name*="ValidTo" i]',
      'input[id*="ValidTo" i]',
      'input[name*="EndDate" i]',
      'input[id*="EndDate" i]',
      'input[placeholder*="expiry" i]',
      'input[placeholder*="expire" i]',
      'input[aria-label*="expiry" i]',
      'input[aria-label*="expire" i]',
    ].join(', ')
  );

  await expect(expiryDateInput.first()).toBeVisible({ timeout: 15000 });

  const expiryInputType = await expiryDateInput
    .first()
    .evaluate((el) => (el.getAttribute('type') || '').toLowerCase());

  const expiryIsReadOnly = await expiryDateInput
    .first()
    .evaluate((el) =>
      el.hasAttribute('readonly') || el.getAttribute('aria-readonly') === 'true'
    );

  let expirySet = false;

  // ---- Strategy 1: Native HTML5 date input ----
  if (expiryInputType === 'date') {
    try {
      await expiryDateInput.first().fill(expiryDate.iso);
      expirySet = true;
      console.log(`✅ Expiry Date set via native date input: ${expiryDate.iso}`);
    } catch (e) {
      // fall through to next strategy
    }
  }

  // ---- Strategy 2: Plain text input (typeable) ----
  if (!expirySet && !expiryIsReadOnly) {
    const dateFormats = [
      expiryDate.iso,          // 2026-06-19
      expiryDate.ddmmyyyy,     // 19/06/2026
      expiryDate.mmddyyyy,     // 06/19/2026
      expiryDate.ddmmyyyyDash, // 19-06-2026
    ];

    for (const fmt of dateFormats) {
      try {
        await expiryDateInput.first().click();
        await expiryDateInput.first().fill('');
        await expiryDateInput.first().fill(fmt);
        await expiryDateInput.first().press('Tab');
        await page.waitForTimeout(500);

        const currentValue = await expiryDateInput.first().inputValue().catch(() => '');
        if (currentValue && currentValue.length > 0) {
          expirySet = true;
          console.log(`✅ Expiry Date typed: "${fmt}" (input value: "${currentValue}")`);
          break;
        }
      } catch (e) {
        // try next format
      }
    }
  }

  // ---- Strategy 3: Calendar widget (click date cell) ----
  if (!expirySet) {
    console.log('📆 Falling back to calendar widget navigation...');

    // Open the date picker
    await expiryDateInput.first().click();
    await page.waitForTimeout(800);

    // Header match: "June 2026", "Jun 2026", "06/2026", etc.
    const targetMonthYearRegex = new RegExp(
      `${expiryDate.monthName}\\s+${expiryDate.year}|` +
      `${expiryDate.monthShortName}\\s+${expiryDate.year}|` +
      `${expiryDate.monthPadded}[\\/\\-]${expiryDate.year}`,
      'i'
    );

    const monthHeader = page.locator(
      [
        '.datepicker-switch',
        '.ui-datepicker-title',
        '.flatpickr-current-month',
        '.react-datepicker__current-month',
        '.MuiPickersCalendarHeader-label',
        '[class*="calendar-header"]',
        '[class*="datepicker-header"]',
      ].join(', ')
    );

    const nextArrow = page.locator(
      [
        '.datepicker .next:visible',
        '.ui-datepicker-next:visible',
        '.flatpickr-next-month:visible',
        '.react-datepicker__navigation--next:visible',
        '[aria-label*="next month" i]:visible',
        '[aria-label="Next Month"]:visible',
        'button[title*="next" i]:visible',
        '.calendar-next:visible',
        '[class*="next-month"]:visible',
      ].join(', ')
    );

    // Click "next" until the header matches the target month/year (safety cap: 24 clicks)
    let navigated = false;
    for (let i = 0; i < 24; i++) {
      const headerText = (await monthHeader
        .first()
        .textContent()
        .catch(() => '')) || '';

      if (targetMonthYearRegex.test(headerText)) {
        navigated = true;
        console.log(`✅ Calendar showing: "${headerText.trim()}"`);
        break;
      }

      if (await nextArrow.first().isVisible().catch(() => false)) {
        await nextArrow.first().click();
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }

    if (!navigated) {
      console.log('⚠️  Could not confirm calendar month header — attempting day click anyway.');
    }

    // Click the target day. Filter out grayed-out cells from adjacent months.
    const dayCellCandidates = [
      page.locator(
        `td.day:not(.old):not(.new):not(.disabled):has-text("${expiryDate.day}")`
      ),
      page.locator(
        `td[data-day="${expiryDate.day}"]:not(.disabled)`
      ),
      page.locator(
        `[aria-label*="${expiryDate.monthName} ${expiryDate.day}, ${expiryDate.year}" i]`
      ),
      page.locator(
        `[aria-label*="${expiryDate.day} ${expiryDate.monthName} ${expiryDate.year}" i]`
      ),
      page.getByRole('gridcell', { name: new RegExp(`^${expiryDate.day}$`) }),
      page.getByRole('button', { name: new RegExp(`^${expiryDate.day}$`) }),
      page.locator(
        `.react-datepicker__day--0${expiryDate.dayPadded}:not(.react-datepicker__day--outside-month)`
      ),
      page.locator(
        `.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay):has-text("${expiryDate.day}")`
      ),
    ];

    let dayClicked = false;
    for (const cell of dayCellCandidates) {
      if (await cell.first().isVisible().catch(() => false)) {
        await cell.first().click();
        dayClicked = true;
        console.log(
          `✅ Expiry Date set via calendar: ${expiryDate.day} ${expiryDate.monthName} ${expiryDate.year}`
        );
        break;
      }
    }

    if (!dayClicked) {
      throw new Error(
        `Could not set expiry date. ` +
        `Target: ${expiryDate.iso}. ` +
        `Input type: "${expiryInputType}", readonly: ${expiryIsReadOnly}.`
      );
    }

    expirySet = true;
  }

  await page.waitForTimeout(1000);

  // ==========================================
  // Click "Next" Button
  // ==========================================
  console.log(`\n➡️  Clicking "Next" button...`);

  // Close any open date picker overlay first by clicking somewhere neutral
  // (some pickers can intercept clicks on Next if still visible)
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } catch (e) {
    // ignore
  }

  const nextButton = page.locator(
    [
      'button:has-text("Next"):visible',
      'a:has-text("Next"):visible',
      'input[type="button"][value="Next" i]',
      'input[type="submit"][value="Next" i]',
      'button[name*="next" i]:visible',
      'button[id*="next" i]:visible',
      '[role="button"]:has-text("Next"):visible',
    ].join(', ')
  );

  // Filter to the most likely candidate (exact "Next" text, not "Next Month" etc.)
  const nextButtonByRole = page.getByRole('button', { name: /^next$/i });
  const nextLinkByRole = page.getByRole('link', { name: /^next$/i });

  let clickedNext = false;

  // Try exact-match role-based locators first
  for (const candidate of [nextButtonByRole, nextLinkByRole]) {
    if (await candidate.first().isVisible().catch(() => false)) {
      await expect(candidate.first()).toBeEnabled({ timeout: 10000 });
      await candidate.first().scrollIntoViewIfNeeded();
      await candidate.first().click();
      clickedNext = true;
      console.log(`✅ "Next" button clicked (exact role match)`);
      break;
    }
  }

  // Fallback to broader CSS selector
  if (!clickedNext) {
    await expect(nextButton.first()).toBeVisible({ timeout: 10000 });
    await expect(nextButton.first()).toBeEnabled({ timeout: 10000 });
    await nextButton.first().scrollIntoViewIfNeeded();
    await nextButton.first().click();
    clickedNext = true;
    console.log(`✅ "Next" button clicked (CSS match)`);
  }

  // Wait for the next step/page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  console.log(`\n✅ Moved to next step successfully.`);

  // Pause for debugging - remove when running in CI
  await page.pause();
});