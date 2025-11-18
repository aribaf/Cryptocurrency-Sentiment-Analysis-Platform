{
  "extends"; [
    "stylelint-config-standard"
  ],
  "rules"; {
    // Disables the error for @tailwind and @apply rules
    "at-rule-no-unknown"; [
      true,
      {
        "ignoreAtRules": [
          "tailwind",
          "apply",
          "variants",
          "screen"
        ]
      }
    ],
    // You might also want to disable the vendor prefix rule:
    "property-no-vendor-prefix"; null 
  }
}