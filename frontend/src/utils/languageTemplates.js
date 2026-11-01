export const STARTER_TEMPLATES = {
  python: `# Write your solution in Python 3
import sys

def main():
    input_text = sys.stdin.read().strip()
    if not input_text:
        return
    # Your solution here

if __name__ == '__main__':
    main()
`,
  c: `// Write your solution in C
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Read input from standard input
    // Example:
    // int a, b;
    // if (scanf("%d %d", &a, &b) == 2) { ... }

    return 0;
}
`,
  cpp: `// Write your solution in C++
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Read input from standard input
    // Your solution here

    return 0;
}
`,
  java: `// Write your solution in Java
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        // Read input from standard input
        // while (scanner.hasNext()) { ... }

        scanner.close();
    }
}
`,
  javascript: `// Write your solution in JavaScript (Node.js)
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const lines = [];

rl.on('line', (line) => {
    lines.push(line);
});

rl.on('close', () => {
    // Process input lines
    // Your solution here
});
`
};

export const DEFAULT_LANGUAGES = ['python', 'c', 'cpp', 'java', 'javascript'];
