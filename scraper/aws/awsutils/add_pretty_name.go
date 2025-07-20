package awsutils

import "strings"

func capitalize(s string) string {
	return strings.ToUpper(s[:1]) + s[1:]
}

// AddPrettyName adds a pretty name to an instance type
func AddPrettyName(instanceType string, familyNames map[string]string) string {
	instanceSplit := strings.Split(instanceType, ".")
	family := instanceSplit[0]
	short := instanceSplit[1]
	prefix, ok := familyNames[family]
	if !ok {
		prefix = strings.ToUpper(family)
	}

	extra := ""
	extraFound := true
	switch {
	case strings.HasPrefix(short, "8x"):
		extra = "Eight"
	case strings.HasPrefix(short, "4x"):
		extra = "Quadruple"
	case strings.HasPrefix(short, "2x"):
		extra = "Double"
	case strings.HasPrefix(short, "10x"):
		extra = "Deca"
	case strings.HasPrefix(short, "12x"):
		extra = "12xlarge"
	case strings.HasPrefix(short, "16x"):
		extra = "16xlarge"
	case strings.HasPrefix(short, "x"):
		extra = ""
	default:
		extraFound = false
	}
	bits := []string{prefix}
	if extraFound {
		bits = append(bits, extra, "Extra")
		short = "Large"
	}
	bits = append(bits, capitalize(short))

	pName := ""
	nonBlanks := 0
	for _, chunk := range bits {
		if chunk != "" {
			nonBlanks++
			if nonBlanks > 1 {
				pName += " "
			}
			pName += chunk
		}
	}
	return pName
}
