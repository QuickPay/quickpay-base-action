require "yaml"
require "test/helper"

describe "Rubocop" do
    it "exists" do
        _(File.file?(".rubocop.yml")).to be_true
    end
end