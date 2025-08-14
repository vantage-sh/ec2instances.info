package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

var slackWebhookUrl = os.Getenv("SLACK_WEBHOOK_URL")

func sendSlackMessage(message string) {
	// use net/http to send the message to the webhook.
	jsonData := map[string]string{
		"text": message,
	}
	jsonDataBytes, err := json.Marshal(jsonData)
	if err != nil {
		log.Default().Println("Error marshalling Slack JSON:", err)
		return
	}

	// send the message to the webhook.
	request, err := http.NewRequest("POST", slackWebhookUrl, bytes.NewBuffer(jsonDataBytes))
	if err != nil {
		log.Default().Println("Error creating Slack request:", err)
		return
	}
	request.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		log.Default().Println("Error sending Slack message:", err)
		return
	}
	defer response.Body.Close()

	// check the response status.
	if response.StatusCode != http.StatusOK {
		log.Default().Println("Error sending Slack message:", response.Status)
		return
	}
}

// SendWarning sends a warning to the console, and if a webhook is set,
// to Slack.
func SendWarning(warningData ...any) {
	warningData = append([]any{"WARNING:"}, warningData...)
	x := fmt.Sprintln(warningData...)
	log.Default().Println(x)

	if slackWebhookUrl != "" {
		sendSlackMessage(x)
	}
}
