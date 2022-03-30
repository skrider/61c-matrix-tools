const fs = require("fs")
const process = require("process")
const path = require("path")
const os = require("os")

let argv = process.argv.slice(1) // get rid of leading "node"
const arg_set = new Set(argv.slice(1))

if (arg_set.has("--help") || argv.length === 1) {
  console.log(
`Print matrices in the CS61C Project 2 format to stdout from .bin files. 
Do not use DIR/* syntax. Use just DIR

Usage:
node pmatrix.js [dir|file] [options...]

Files must be .bin.
Do not use a wildcard (DIR/*). Use just DIR.

Options:
  --help    display this message
  --head    display only the filename and dimensions 
  --latex   print in latex form. 
            Overrides --head.
            Useful to copy/paste into symbolab or Wolfram Alpha:
              Powershell:   set-clipboard \${node pmatrix.js m0.bin --latex}
              Mac zsh:      node pmatrix.js m0.bin --latex | pbcopy

Have an idea for a helpful feature? The code is pretty simple and well-documented.
Contributions are welcome! Submit a PR.
`)
  process.exit(0);
}

/**
 * Reads an int from a file and advances the file pointer
 * @param fd file descriptor
 */
function read_int32_from_file(fd) {
  const buffer = Buffer.alloc(4)
  fs.readSync(fd, buffer, 0, 4, null)
  // JS's optimization under the hood is pretty good at speeding this up
  if (os.endianness() == "BE") {
    return buffer.readInt32BE(0)
  } else {
    return buffer.readInt32LE(0)
  }
}

/**
 * Computes width in chars of the number
 * @param num 
 */
function compute_width(num) {
  let abs = Math.abs(num)
  return (abs < 1 ? 
    0 : 
    num > 0 ? 
      Math.floor(Math.log10(abs)) :
      Math.floor(Math.log10(abs)) + 1
  )
}

/**
 * Reads a file and returns a Number[][] containing its contents
 * @param fpath
 * @returns matrix 
 */
function load_matrix(fpath) {
  const fd = fs.openSync(fpath, 'r') // get file descriptor
  const matrix = []
  const rows = read_int32_from_file(fd)
  const cols = read_int32_from_file(fd)
  let max_width = 0; // we keep track of max width in order to format the matrix nicely
  for (let i = 0; i < rows; i++) {
    matrix.push([]);
    for (let j = 0; j < cols; j++) {
      let num = read_int32_from_file(fd)
      matrix[i].push(num);
      max_width = Math.max(max_width, compute_width(num)) 
    }
  }
  return {matrix, max_width}
}

/**
 * Prints matrix in tabular form
 * @param fpath 
 */
function print_matrix_visual(fpath) {
  const {matrix, max_width} = load_matrix(fpath)
  console.log(path.basename(fpath))
  console.log(`rows: ${matrix.length}`)
  console.log(`columns: ${matrix[0].length}`)
  for (let i in matrix) {
    for (let j in matrix[i]) {
      process.stdout.write(`| ${
        " ".repeat(max_width - compute_width(matrix[i][j]))
      }${
        matrix[i][j]
      } `)
    }
    process.stdout.write("|\n")
  }
}

/**
 * Prints matrix metadata
 * @param fpath 
 */
function print_matrix_head(fpath) {
  const {matrix} = load_matrix(fpath)
  console.log(path.basename(fpath))
  console.log(`rows:    ${matrix.length}`)
  console.log(`columns: ${matrix[0].length}`)
}

/**
 * Outputs matrix in latex form, suitable for copy/pasting into symbolic math engines
 * Yes, I am too lazy to write another matrix multiplier.
 * @param fpath 
 */
function print_matrix_latex(fpath) {
  const {matrix, max_width} = load_matrix(fpath)
  console.log("\\begin{bmatrix}")
  for (let i in matrix) {
    for (let j in matrix[i]) {
      process.stdout.write(` ${
        " ".repeat(max_width - compute_width(matrix[i][j]))
      }${
        matrix[i][j]
      } ${
        matrix[0].length - j == 1 ? "" : "&"
      }`)
    }
    if (matrix.length - i !== 1) {
      process.stdout.write("\\\\ \n")
    }
  }
  console.log("\n\\end{bmatrix}")
}

function print_matrix(fpath) {
  if (arg_set.has("--head")) {
    print_matrix_head(fpath)
  } else if (arg_set.has("--latex")) {
    print_matrix_latex(fpath)
  } else {
    print_matrix_visual(fpath)
  }
  console.log()
}

function print_all(fpath) {
  fs.readdirSync(fpath)
    .filter(file => path.extname(file) == ".bin")
    .map(file => path.join(fpath, file))
    .forEach(print_matrix)
}

const root_path = path.isAbsolute(argv[1]) ? 
  argv[1] : 
  path.resolve(process.cwd(), argv[1]);

if (fs.lstatSync(root_path).isDirectory()) {
  print_all(root_path)
} else if (path.extname(root_path) === ".bin") {
  print_matrix(root_path)
} else {
  throw new Error("Please specify a directory or .bin file as the first argument.")
}
