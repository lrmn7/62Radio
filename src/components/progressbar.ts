const progressBar = [
  { index: 0, text: "[          ]" },
  { index: 1, text: "[■         ]" },
  { index: 2, text: "[■■        ]" },
  { index: 3, text: "[■■■       ]" },
  { index: 4, text: "[■■■■      ]" },
  { index: 5, text: "[■■■■■     ]" },
  { index: 6, text: "[■■■■■■    ]" },
  { index: 7, text: "[■■■■■■■   ]" },
  { index: 8, text: "[■■■■■■■■  ]" },
  { index: 9, text: "[■■■■■■■■■ ]" },
  { index: 10, text: "[■■■■■■■■■■]" },
];

function getString(percentage: number): string | undefined {
  return (
    "`" +
    progressBar.find(
      (element) => element.index === Math.min(10, Math.floor(percentage / 10)),
    )?.text +
    "`"
  );
}

export default {
  progressBar: progressBar,
  getString: getString,
};
